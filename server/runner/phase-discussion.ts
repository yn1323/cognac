// Phase 2-B: マルチペルソナディスカッション
// 選出されたペルソナ陣によるロールプレイ形式の議論（最大3ラウンド）

import type Database from 'better-sqlite3'
import type {
  Task,
  CognacConfig,
  TaskEvent,
  Persona,
  Discussion,
  DiscussionRound,
} from '@cognac/shared'
import { callClaude } from './claude-caller.js'
import { extractJson } from './json-parser.js'
import { getRepoStructure } from './context-cache.js'
import * as discussionQueries from '../db/queries/discussions.js'
import * as logQueries from '../db/queries/execution-logs.js'
import { groupDiscussionsByRound } from './discussion-utils.js'

// ペルソナ定義をMarkdownに変換
function formatPersonas(personas: Persona[]): string {
  return personas
    .map(
      (p) =>
        `- **${p.name}** (${p.persona_id}): ${p.focus}。スタイル: ${p.tone}`,
    )
    .join('\n')
}

// ディスカッションのシステムプロンプトを構築
function buildSystemPrompt(personas: Persona[]): string {
  return `あなたは以下の専門家チーム全員をロールプレイする。
各ペルソナの視点から、タスクについて建設的に議論してくれ。

## チームメンバー
${formatPersonas(personas)}

## ルール
- 各メンバーは自分の専門領域から発言する
- 他のメンバーの意見に建設的な反論・補足をする
- 気心の知れた開発チームの仲間として、カジュアルに議論する
- 技術的な正確さは維持しつつ、噛み砕いた表現を使う

必ず以下のJSONフォーマットだけを返して。余計な説明はいらない。

\`\`\`json
{
  "round": 1,
  "statements": [
    {
      "personaId": "frontend-engineer",
      "content": "この機能の実装だけど、コンポーネント分割は...",
      "keyPoints": ["コンポーネント分割の方針", "状態管理の選択"]
    }
  ],
  "shouldContinue": true,
  "reason": "まだテスト戦略について議論が必要"
}
\`\`\`

### shouldContinueの判定基準
以下の場合は false にして:
- 全メンバーが主要な論点で合意に達した
- 新しい論点や反論が出なくなった
- 前ラウンドと実質的に同じ議論の繰り返しになった

出力がJSONフォーマットに準拠しているか確認してから返して。`
}

// ラウンドごとのユーザープロンプトを構築
function buildRoundPrompt(
  task: Task,
  round: number,
  repoStructure: string,
  previousRounds: Discussion[],
  isLastRound: boolean,
): string {
  let prompt = `## タスク情報

**タイトル**: ${task.title}
**説明**: ${task.description ?? '（説明なし）'}

${repoStructure}

## ラウンド ${round}
`

  if (round === 1) {
    prompt += '\nタスクについて各メンバーの初期意見を聞かせて。'
  } else {
    // 前ラウンドの発言を含める
    prompt += '\n### 前ラウンドまでの議論\n\n'
    const grouped = groupDiscussionsByRound(previousRounds)
    for (const [r, discussions] of grouped) {
      prompt += `#### ラウンド ${r}\n`
      for (const d of discussions) {
        prompt += `- **${d.persona_name}**: ${d.content}\n`
      }
      prompt += '\n'
    }
    prompt += '前ラウンドを踏まえて、反論・補足・合意形成をしてくれ。'
  }

  if (isLastRound) {
    prompt += '\n\n**注意: これが最終ラウンドだ。shouldContinueは必ずfalseにして、結論をまとめてくれ。**'
  }

  return prompt
}

export async function executePhaseDiscussion(
  task: Task,
  personas: Persona[],
  db: Database.Database,
  config: CognacConfig,
  onEvent?: (event: TaskEvent) => void,
): Promise<{
  discussions: Discussion[]
  sessionId: string
  totalTokenInput: number
  totalTokenOutput: number
  totalDurationMs: number
}> {
  const maxRounds = config.discussion.maxRounds
  const repoStructure = getRepoStructure()
  const systemPrompt = buildSystemPrompt(personas)

  const allDiscussions: Discussion[] = []
  let sessionId = ''
  let totalTokenInput = 0
  let totalTokenOutput = 0
  let totalDurationMs = 0

  for (let round = 1; round <= maxRounds; round++) {
    const isLastRound = round === maxRounds

    // SSEイベント: ラウンド開始
    onEvent?.({ type: 'discussion_round_start', round })

    const userPrompt = buildRoundPrompt(task, round, repoStructure, allDiscussions, isLastRound)

    let discussionRound: DiscussionRound | null = null

    // 最大2回トライ（初回 + 1回リトライ）
    let response = { result: '', sessionId: '', usage: { inputTokens: 0, outputTokens: 0 }, durationMs: 0 }

    for (let attempt = 0; attempt < 2; attempt++) {
      response = await callClaude(
        {
          prompt: userPrompt,
          systemPrompt,
          sessionId: sessionId || undefined,
          maxTurns: config.claude.maxTurnsDiscussion,
        },
        config,
      )

      try {
        discussionRound = extractJson<DiscussionRound>(response.result)
        if (discussionRound.statements && discussionRound.statements.length > 0) {
          // 成功時のみセッションIDを取得（リトライ成功時も対応）
          if (!sessionId && response.sessionId) {
            sessionId = response.sessionId
          }
          break
        }
        discussionRound = null
      } catch {
        if (attempt === 0) {
          console.warn(`ディスカッション ラウンド${round} のJSON抽出に失敗、リトライする`)
        }
      }
    }

    // JSON抽出に2回失敗したらこのラウンドをスキップして終了
    if (!discussionRound) {
      console.warn(`ディスカッション ラウンド${round} のJSON抽出に2回失敗、ディスカッション終了`)
      break
    }

    // トークン集計
    totalTokenInput += response.usage.inputTokens
    totalTokenOutput += response.usage.outputTokens
    totalDurationMs += response.durationMs

    // 最終ラウンドでは強制的にshouldContinue=false
    if (isLastRound) {
      discussionRound.shouldContinue = false
    }

    // ペルソナ名の高速ルックアップ用Map
    const personaNameMap = new Map(personas.map((p) => [p.persona_id, p.name]))

    // DB保存
    const statements = discussionRound.statements.map((s) => ({
      persona_id: s.personaId,
      persona_name: personaNameMap.get(s.personaId) ?? s.personaId,
      content: s.content,
      key_points: s.keyPoints ?? null,
      should_continue: discussionRound.shouldContinue,
      continue_reason: discussionRound.reason ?? null,
    }))

    const savedDiscussions = discussionQueries.createDiscussionStatements(
      db, task.id, round, statements,
    )
    allDiscussions.push(...savedDiscussions)

    // SSEイベント: 各ペルソナの発言
    for (const s of discussionRound.statements) {
      onEvent?.({
        type: 'discussion_statement',
        round,
        personaId: s.personaId,
        personaName: personaNameMap.get(s.personaId) ?? s.personaId,
        content: s.content,
        keyPoints: s.keyPoints ?? [],
      })
    }

    // SSEイベント: ラウンド終了
    onEvent?.({
      type: 'discussion_round_end',
      round,
      shouldContinue: discussionRound.shouldContinue,
      reason: discussionRound.reason ?? '',
    })

    // 実行ログ記録
    logQueries.createLog(db, {
      task_id: task.id,
      phase: 'discussion',
      session_id: sessionId,
      token_input: response.usage.inputTokens,
      token_output: response.usage.outputTokens,
      duration_ms: response.durationMs,
      output_summary: `ラウンド${round}: ${discussionRound.statements.length}名が発言、継続=${discussionRound.shouldContinue}`,
    })

    // 早期終了判定
    if (!discussionRound.shouldContinue) {
      break
    }
  }

  return {
    discussions: allDiscussions,
    sessionId,
    totalTokenInput,
    totalTokenOutput,
    totalDurationMs,
  }
}
