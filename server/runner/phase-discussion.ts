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
import { callClaudePrint } from './claude-caller.js'
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
  return `あなたは以下の専門家チーム全員をロールプレイして、チャットアプリでの会話を再現してくれ。

## チームメンバー
${formatPersonas(personas)}

## ルール
- チャットアプリでの会話のように、短い発言（1〜3文）でテンポよくやり取りする
- 1人が長々と話すのではなく、相手の発言にリアクションしながら会話を進める
- 「それいいね」「なるほど〜」「ちょっと待って、それだと〜」のような自然な相槌・反応を入れる
- 各メンバーは自分の専門領域の視点から発言する
- 意見が割れるところは遠慮なく突っ込む（ただし建設的に）
- 各メンバーのtoneに設定されたキャラクター性を発言に反映する
- 社内Slackみたいなノリで、絵文字をどんどん使ってOK！（😊🎉💡🤔👍🔥✨😅💪 など）
- 発言の最初にリアクション絵文字を置いたり、文末に添えたり、自然に散りばめる
- 長めの発言（2文以上）は途中で改行（\\n）を入れて読みやすくする
- 1ラウンドで合計8〜15メッセージ程度のやり取りをする

必ず以下のJSONフォーマットだけを返して。余計な説明はいらない。

\`\`\`json
{
  "round": 1,
  "messages": [
    { "personaId": "frontend-engineer", "content": "この機能、コンポーネントどう分けるか考えたいんだけど🤔" },
    { "personaId": "backend-engineer", "content": "💡 APIの方から先に決めない？\\nエンドポイント設計が固まらないとフロントも動けないでしょ" },
    { "personaId": "frontend-engineer", "content": "たしかに！じゃあまずAPI仕様からいこう👍" }
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
    prompt += '\nタスクについてチャットで話し合って。各メンバーの初見の反応から始めて。'
  } else {
    // 前ラウンドの会話をチャットログ形式で含める
    prompt += '\n### これまでの会話\n\n'
    const grouped = groupDiscussionsByRound(previousRounds)
    for (const [, discussions] of grouped) {
      for (const d of discussions) {
        prompt += `**${d.persona_name}**: ${d.content}\n`
      }
    }
    prompt += '\nこの会話の続きをしてくれ。前の話を踏まえて、まだ決まっていない点を議論して。'
  }

  if (isLastRound) {
    prompt += '\n\n**注意: これが最終ラウンドだ。shouldContinueはfalseにして、結論を短くまとめるメッセージで締めてくれ。**'
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

  // ペルソナ名の高速ルックアップ用Map（ループ外で1回だけ構築）
  const personaNameMap = new Map(personas.map((p) => [p.persona_id, p.name]))

  for (let round = 1; round <= maxRounds; round++) {
    const isLastRound = round === maxRounds

    // SSEイベント: ラウンド開始
    onEvent?.({ type: 'discussion_round_start', round })

    const userPrompt = buildRoundPrompt(task, round, repoStructure, allDiscussions, isLastRound)

    let discussionRound: DiscussionRound | null = null

    // 最大2回トライ（初回 + 1回リトライ）
    let response = { result: '', sessionId: '', usage: { inputTokens: 0, outputTokens: 0 }, durationMs: 0 }

    for (let attempt = 0; attempt < 2; attempt++) {
      response = await callClaudePrint(
        {
          prompt: userPrompt,
          systemPrompt,
        },
        config,
      )

      try {
        discussionRound = extractJson<DiscussionRound>(response.result)
        if (discussionRound.messages && discussionRound.messages.length > 0) {
          // ログ用に最後の成功セッションIDを記録
          if (response.sessionId) {
            sessionId = response.sessionId
          }
          break
        }
        discussionRound = null
      } catch (err) {
        const msg = `ディスカッション ラウンド${round} のJSON抽出に失敗 (attempt=${attempt}): ${(err as Error).message}`
        console.warn(msg)
        onEvent?.({ type: 'debug_log', message: msg, level: 'warn' })
        // デバッグ用: response.result の全文をログ出力
        const fullDump = `[DEBUG] response.result 全文 (${response.result.length}文字):\n${response.result}`
        console.warn(fullDump)
        onEvent?.({ type: 'debug_log', message: fullDump, level: 'warn' })
      }
    }

    // JSON抽出に2回失敗したらこのラウンドをスキップして終了
    if (!discussionRound) {
      const msg2 = `ディスカッション ラウンド${round} のJSON抽出に2回失敗、ディスカッション終了`
      console.warn(msg2)
      onEvent?.({ type: 'debug_log', message: msg2, level: 'error' })
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

    // DB保存
    const statements = discussionRound.messages.map((m) => ({
      persona_id: m.personaId,
      persona_name: personaNameMap.get(m.personaId) ?? m.personaId,
      content: m.content,
      key_points: null,
      should_continue: discussionRound.shouldContinue,
      continue_reason: discussionRound.reason ?? null,
    }))

    const savedDiscussions = discussionQueries.createDiscussionStatements(
      db, task.id, round, statements,
    )
    allDiscussions.push(...savedDiscussions)

    // SSEイベント: 各メッセージ（チャット順を保持）
    for (const m of discussionRound.messages) {
      onEvent?.({
        type: 'discussion_statement',
        round,
        personaId: m.personaId,
        personaName: personaNameMap.get(m.personaId) ?? m.personaId,
        content: m.content,
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
      output_summary: `ラウンド${round}: ${discussionRound.messages.length}メッセージ、継続=${discussionRound.shouldContinue}`,
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
