// Phase 2-C: プラン策定
// ディスカッション結果から実装計画とPhase 3用の実行プロンプトを生成する

import type Database from 'better-sqlite3'
import type {
  Task,
  CognacConfig,
  TaskEvent,
  Persona,
  Discussion,
  Plan,
  PlanResult,
} from '@cognac/shared'
import { callClaude } from './claude-caller.js'
import { extractJson } from './json-parser.js'
import { getRepoStructure } from './context-cache.js'
import * as planQueries from '../db/queries/plans.js'
import * as imageQueries from '../db/queries/task-images.js'
import * as logQueries from '../db/queries/execution-logs.js'
import { groupDiscussionsByRound } from './discussion-utils.js'

// プラン策定のシステムプロンプト
// 一時コメントアウト: git commit指示を除去（不具合調査のノイズ除去）
// 元の指示: 「実装が完了したらgit commitしといて」「コミットメッセージの形式は自由でOK」
function buildSystemPrompt(): string {
  return `あなたはテックリードだ。ディスカッション結果を基に、実装計画と実行プロンプトを作成してくれ。

## 計画書（plan）について
チームのSlackで共有するメモのようなテイストで書いて。堅い設計書じゃなくて、要点がサクッと伝わるカジュアルな文体で。

含めるべき内容:
- 変更対象ファイル一覧（何を作る・何を変える・何を消す）
- 実装手順（ざっくりとしたステップ）
- テスト方針（どこまでやるか）
- ディスカッションで決まった重要な判断とその理由
- 注意点・ハマりそうなポイント

## 実行プロンプト（executionPrompt）について
Phase 3でClaude Codeに渡す完全な指示を生成して。以下を含めて:
- 具体的なファイルパスと変更内容
- コーディング規約への言及
- 添付画像がある場合は、画像ファイルのパスとReadツールで読み取る指示
- テストがあるならテストも書いて

## 推定複雑度（estimatedComplexity）
- low: 1ファイル変更、単純な修正
- medium: 複数ファイル変更、ある程度の設計判断が必要
- high: 大規模な変更、アーキテクチャに影響

必ず以下のJSONフォーマットだけを返して。余計な説明はいらない。

\`\`\`json
{
  "plan": "## 実装計画\\n\\n### 変更対象\\n- ...",
  "executionPrompt": "以下のタスクを実装してくれ。\\n\\n...",
  "estimatedComplexity": "medium"
}
\`\`\`

出力がJSONフォーマットに準拠しているか確認してから返して。`
}

// ディスカッションログをMarkdownに変換
function formatDiscussions(discussions: Discussion[]): string {
  if (discussions.length === 0) {
    return '（ディスカッションなし）'
  }

  const grouped = groupDiscussionsByRound(discussions)

  let markdown = ''
  for (const [round, entries] of grouped) {
    markdown += `### ラウンド ${round}\n\n`
    for (const d of entries) {
      const keyPoints = d.key_points ? JSON.parse(d.key_points) as string[] : []
      markdown += `**${d.persona_name}**: ${d.content}\n`
      if (keyPoints.length > 0) {
        markdown += `  要点: ${keyPoints.join('、')}\n`
      }
      markdown += '\n'
    }
  }
  return markdown
}

// ユーザープロンプトを構築
function buildUserPrompt(
  task: Task,
  discussions: Discussion[],
  repoStructure: string,
  imagePaths: string[],
): string {
  let prompt = `## タスク情報

**タイトル**: ${task.title}
**説明**: ${task.description ?? '（説明なし）'}

## ディスカッション結果

${formatDiscussions(discussions)}

${repoStructure}`

  if (imagePaths.length > 0) {
    prompt += `\n\n## 添付画像\n\n`
    for (const path of imagePaths) {
      prompt += `- ${path}\n`
    }
    prompt += `\n実行プロンプトに「Readツールで上記画像を読み取って参考にしてくれ」と含めて。`
  }

  prompt += '\n\nこの情報を基に、実装計画と実行プロンプトを作成して。'

  return prompt
}

export async function executePhasePlan(
  task: Task,
  discussions: Discussion[],
  personas: Persona[],
  db: Database.Database,
  config: CognacConfig,
  onEvent?: (event: TaskEvent) => void,
): Promise<{
  plan: Plan
  sessionId: string
  tokenInput: number
  tokenOutput: number
  durationMs: number
}> {
  const repoStructure = getRepoStructure()
  const systemPrompt = buildSystemPrompt()

  // 添付画像のパス一覧を取得
  const images = imageQueries.listTaskImages(db, task.id)
  const imagePaths = images.map((img) => img.file_path)

  const userPrompt = buildUserPrompt(task, discussions, repoStructure, imagePaths)

  let planResult: PlanResult | null = null
  let response = { result: '', sessionId: '', usage: { inputTokens: 0, outputTokens: 0 }, durationMs: 0 }

  // 最大2回トライ（初回 + 1回リトライ）
  for (let attempt = 0; attempt < 2; attempt++) {
    response = await callClaude(
      {
        prompt: userPrompt,
        systemPrompt,
        maxTurns: 1,
      },
      config,
    )

    try {
      planResult = extractJson<PlanResult>(response.result)
      if (planResult.plan && planResult.executionPrompt) {
        break
      }
      planResult = null
    } catch (err) {
      const msg = `プラン策定のJSON抽出に失敗 (attempt=${attempt}): ${(err as Error).message}`
      console.warn(msg)
      onEvent?.({ type: 'debug_log', message: msg, level: 'warn' })
      const fullDump = `[DEBUG] response.result 全文 (${response.result.length}文字):\n${response.result}`
      console.warn(fullDump)
      onEvent?.({ type: 'debug_log', message: fullDump, level: 'warn' })
    }
  }

  // フォールバック: JSON抽出失敗時はresponse.resultをそのまま使う
  if (!planResult) {
    const msg2 = 'プラン策定のJSON抽出に2回失敗、レスポンスをそのまま使用'
    console.warn(msg2)
    onEvent?.({ type: 'debug_log', message: msg2, level: 'error' })
    planResult = {
      plan: response.result,
      executionPrompt: `以下のタスクを実装してくれ。

## タスク
**タイトル**: ${task.title}
**説明**: ${task.description ?? '（説明なし）'}

## 計画
${response.result}

## 指示
- テストがあるならテストも書いて`,
      estimatedComplexity: 'medium',
    }
  }

  // ペルソナ情報をJSON化
  const personasUsed = JSON.stringify(
    personas.map((p) => ({ id: p.persona_id, name: p.name })),
  )

  // ディスカッションの最終ラウンド番号
  const totalRounds = discussions.length > 0
    ? Math.max(...discussions.map((d) => d.round))
    : 0

  // DB保存
  const plan = planQueries.createPlan(db, {
    task_id: task.id,
    plan_markdown: planResult.plan,
    execution_prompt: planResult.executionPrompt,
    personas_used: personasUsed,
    total_rounds: totalRounds,
    estimated_complexity: planResult.estimatedComplexity ?? null,
  })

  // 実行ログ記録
  logQueries.createLog(db, {
    task_id: task.id,
    phase: 'plan',
    session_id: response.sessionId,
    token_input: response.usage.inputTokens,
    token_output: response.usage.outputTokens,
    duration_ms: response.durationMs,
    output_summary: `推定複雑度: ${planResult.estimatedComplexity}`,
  })

  // SSEイベント
  onEvent?.({
    type: 'plan_created',
    planMarkdown: planResult.plan,
    estimatedComplexity: planResult.estimatedComplexity,
  })

  return {
    plan,
    sessionId: response.sessionId,
    tokenInput: response.usage.inputTokens,
    tokenOutput: response.usage.outputTokens,
    durationMs: response.durationMs,
  }
}
