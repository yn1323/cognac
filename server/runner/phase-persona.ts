// Phase 2-A: ペルソナ選定
// タスクに最適な専門家チーム（2〜4名）を選出する

import type Database from 'better-sqlite3'
import type { Task, CognacConfig, TaskEvent, Persona, PersonaSelection } from '@cognac/shared'
import { callClaudePrint } from './claude-caller.js'
import { extractJson } from './json-parser.js'
import { getRepoStructure, getTaskHistory } from './context-cache.js'
import * as personaQueries from '../db/queries/personas.js'
import * as logQueries from '../db/queries/execution-logs.js'

// ペルソナ選定のシステムプロンプト
function buildSystemPrompt(config: CognacConfig): string {
  return `あなたは開発チームのリーダーだ。
タスクの内容を分析して、最適な専門家チーム（${config.discussion.minPersonas}〜${config.discussion.maxPersonas}名）を選出してくれ。

各メンバーには以下を設定して:
- id: kebab-case の識別子（例: "security-engineer"）
- name: 日本語の役割名（例: "セキュリティエンジニア"）
- focus: 注目する専門領域の説明
- tone: チャットでの会話キャラクター。個性が際立つように具体的に設定して。以下のような方向性で:
  - ツッコミ役: 曖昧な方針に「それ本当に大丈夫？」と突っ込む
  - 慎重派: リスクやエッジケースを必ず指摘する心配性
  - ムードメーカー: ノリが良くて「いいじゃん！」と盛り上げる
  - 職人気質: 技術的な美しさにこだわる完璧主義者
  - 現実主義者: 「で、納期いつ？」とスケジュール感を気にする
  各メンバーのキャラが被らないように、チーム全体でバランスを取って。

推定ラウンド数（estimatedRounds）も設定して。シンプルなタスクなら1-2、複雑なら3。

必ず以下のJSONフォーマットだけを返して。余計な説明はいらない。

\`\`\`json
{
  "personas": [
    { "id": "frontend-engineer", "name": "フロントエンドエンジニア", "focus": "UI実装・コンポーネント設計・ユーザー体験", "tone": "ムードメーカー。「おっ、いいじゃん！」とノリよく反応。ただしUXの話になると急に真剣になる" },
    { "id": "backend-engineer", "name": "バックエンドエンジニア", "focus": "API設計・データモデル・パフォーマンス", "tone": "ツッコミ役。甘い設計には「それだと〇〇のとき困るよ？」と容赦なく突っ込む" }
  ],
  "estimatedRounds": 2
}
\`\`\`

出力がJSONフォーマットに準拠しているか確認してから返して。`
}

// ユーザープロンプトを構築する
function buildUserPrompt(task: Task, repoStructure: string, taskHistory: string): string {
  return `## タスク情報

**タイトル**: ${task.title}
**説明**: ${task.description ?? '（説明なし）'}

${repoStructure}

${taskHistory}

このタスクに最適な専門家チームを選出して。`
}

// JSON抽出失敗時のフォールバックペルソナ
function getGenericPersonas(): PersonaSelection {
  return {
    personas: [
      {
        id: 'code-reviewer',
        name: 'コードレビューアー',
        focus: 'コード品質・設計パターン・保守性',
        tone: '建設的。改善点を具体的に提案する',
      },
      {
        id: 'test-engineer',
        name: 'テストエンジニア',
        focus: 'テスト戦略・エッジケース・品質保証',
        tone: '慎重派。壊れやすいポイントを見抜く',
      },
    ],
    estimatedRounds: 2,
  }
}

export async function executePhasePersona(
  task: Task,
  db: Database.Database,
  config: CognacConfig,
  onEvent?: (event: TaskEvent) => void,
  signal?: AbortSignal,
): Promise<{
  personas: Persona[]
  sessionId: string
  tokenInput: number
  tokenOutput: number
  durationMs: number
}> {
  const repoStructure = getRepoStructure()
  const taskHistory = getTaskHistory(db)

  const systemPrompt = buildSystemPrompt(config)
  const userPrompt = buildUserPrompt(task, repoStructure, taskHistory)

  let personaSelection: PersonaSelection | null = null
  let response = { result: '', sessionId: '', usage: { inputTokens: 0, outputTokens: 0 }, durationMs: 0 }

  // 最大2回トライ（初回 + 1回リトライ）
  for (let attempt = 0; attempt < 2; attempt++) {
    response = await callClaudePrint(
      {
        prompt: userPrompt,
        systemPrompt,
        signal,
      },
      config,
    )

    try {
      personaSelection = extractJson<PersonaSelection>(response.result)
      // ペルソナ数のバリデーション
      if (personaSelection.personas && personaSelection.personas.length > 0) {
        break
      }
      personaSelection = null
    } catch (err) {
      const msg = `ペルソナ選定のJSON抽出に失敗 (attempt=${attempt}): ${(err as Error).message}`
      console.warn(msg)
      onEvent?.({ type: 'debug_log', message: msg, level: 'warn' })
      const fullDump = `[DEBUG] response.result 全文 (${response.result.length}文字):\n${response.result}`
      console.warn(fullDump)
      onEvent?.({ type: 'debug_log', message: fullDump, level: 'warn' })
    }
  }

  // フォールバック
  if (!personaSelection) {
    const msg2 = 'ペルソナ選定のJSON抽出に2回失敗、ジェネリックペルソナで続行'
    console.warn(msg2)
    onEvent?.({ type: 'debug_log', message: msg2, level: 'error' })
    personaSelection = getGenericPersonas()
  }

  // DB保存
  const personas = personaQueries.createPersonas(
    db,
    task.id,
    personaSelection.personas.map((p) => ({
      persona_id: p.id,
      name: p.name,
      focus: p.focus,
      tone: p.tone,
    })),
  )

  // 実行ログ記録
  logQueries.createLog(db, {
    task_id: task.id,
    phase: 'persona',
    session_id: response.sessionId,
    token_input: response.usage.inputTokens,
    token_output: response.usage.outputTokens,
    duration_ms: response.durationMs,
    output_summary: `${personas.length}名のペルソナを選出`,
  })

  // SSEイベント
  onEvent?.({ type: 'persona_selected', personas })

  return {
    personas,
    sessionId: response.sessionId,
    tokenInput: response.usage.inputTokens,
    tokenOutput: response.usage.outputTokens,
    durationMs: response.durationMs,
  }
}
