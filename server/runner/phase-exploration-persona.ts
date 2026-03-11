import type {
  CognacConfig,
  ExplorationImage,
  ExplorationPersona,
  ExplorationSession,
  PersonaSelection,
} from '@cognac/shared'
import type Database from 'better-sqlite3'
import * as logQueries from '../db/queries/exploration-logs.js'
import * as personaQueries from '../db/queries/exploration-personas.js'
import { getRepoStructure } from './context-cache.js'
import { extractJson } from './json-parser.js'
import { createProvider } from './providers/index.js'

function buildSystemPrompt(config: CognacConfig): string {
  return `あなたは探索チームのリーダーだ。
依頼内容を見て、最適な専門家チーム（${config.discussion.minPersonas}〜${config.discussion.maxPersonas}名）を選出して。

各メンバーには以下を設定して:
- id: kebab-case の識別子（例: "ux-researcher"）
- name: 日本語の役割名（例: "UXリサーチャー"）
- focus: この探索で注目する観点
- tone: チャットでの会話キャラクター。個性が際立つように具体的に設定して。以下のような方向性で:
  - ツッコミ役: 曖昧な方針に「それ本当に大丈夫？」と突っ込む
  - 慎重派: リスクやエッジケースを必ず指摘する心配性
  - ムードメーカー: ノリが良くて「いいじゃん！」と盛り上げる
  - 職人気質: 技術的な美しさにこだわる完璧主義者
  - 現実主義者: 「で、納期いつ？」とスケジュール感を気にする
  各メンバーのキャラが被らないように、チーム全体でバランスを取って。
- emoji: そのキャラの性格・雰囲気・バイブスが伝わる絵文字を1つ選んで。
  ⚠️ 役割を直接表す絵文字（🔧💻🛡️🧪📊）は避けること。
  性格が伝わるものを選んで。例: ムードメーカー→🎉、冷めたベテラン→🧊、好奇心旺盛→🐿️、慎重派→🧐、ミニマリスト→🍃

Playwright MCP を使う可能性がある場合は、UI検証や再現観点に強いメンバーを含めて。

推定ラウンド数（estimatedRounds）も設定して。シンプルな探索なら1-2、複雑なら3。

必ず以下のJSONフォーマットだけを返して。余計な説明はいらない。

\`\`\`json
{
  "personas": [
    { "id": "ux-researcher", "name": "UXリサーチャー", "focus": "画面挙動とユーザー体験の確認", "tone": "ムードメーカー。「おっ、これ面白いね！」と気になるUIをどんどん拾う。ただし再現性の話になると急に真剣になる", "emoji": "✨" },
    { "id": "qa-engineer", "name": "QAエンジニア", "focus": "再現条件・環境差分・エッジケース", "tone": "ツッコミ役。「それ他の環境でも再現する？」と容赦なく突っ込む", "emoji": "🧐" }
  ],
  "estimatedRounds": 2
}
\`\`\`

出力がJSONフォーマットに準拠しているか確認してから返して。`
}

function buildUserPrompt(
  exploration: ExplorationSession,
  repoStructure: string,
  images: ExplorationImage[],
): string {
  let prompt = `## 探索依頼

**タイトル**: ${exploration.title}
**本文**: ${exploration.request}

${repoStructure}`

  if (images.length > 0) {
    prompt += '\n\n## 添付画像\n'
    for (const image of images) {
      prompt += `- ${image.file_path}\n`
    }
  }

  prompt += '\n\nこの探索依頼に最適な専門家チームを選んで。'
  return prompt
}

function getFallbackPersonas(): PersonaSelection {
  return {
    personas: [
      {
        id: 'product-analyst',
        name: 'プロダクトアナリスト',
        focus: '依頼内容の整理と論点分解',
        tone: '論点を構造化して進行する司会役',
        emoji: '🎯',
      },
      {
        id: 'qa-engineer',
        name: 'QAエンジニア',
        focus: '再現確認、観測ポイント、抜け漏れ検知',
        tone: '慎重派で、再現条件の穴を見つける',
        emoji: '🔍',
      },
    ],
    estimatedRounds: 2,
  }
}

export async function executeExplorationPhasePersona(
  exploration: ExplorationSession,
  images: ExplorationImage[],
  db: Database.Database,
  config: CognacConfig,
  signal?: AbortSignal,
): Promise<{
  personas: ExplorationPersona[]
  sessionId: string
  tokenInput: number
  tokenOutput: number
  durationMs: number
}> {
  const provider = createProvider(config.provider)
  const repoStructure = getRepoStructure()
  const systemPrompt = buildSystemPrompt(config)
  const userPrompt = buildUserPrompt(exploration, repoStructure, images)

  let response = {
    result: '',
    sessionId: '',
    usage: { inputTokens: 0, outputTokens: 0 },
    durationMs: 0,
  }
  let personaSelection: PersonaSelection | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    response = await provider.execPrint({ prompt: userPrompt, systemPrompt, signal }, config)
    try {
      personaSelection = extractJson<PersonaSelection>(response.result)
      if (personaSelection.personas.length > 0) break
      personaSelection = null
    } catch {
      personaSelection = null
    }
  }

  if (!personaSelection) {
    personaSelection = getFallbackPersonas()
  }

  const personas = personaQueries.createExplorationPersonas(
    db,
    exploration.id,
    personaSelection.personas.map((persona) => ({
      persona_id: persona.id,
      name: persona.name,
      focus: persona.focus,
      tone: persona.tone,
      emoji: persona.emoji || '',
    })),
  )

  logQueries.createExplorationLog(db, {
    exploration_session_id: exploration.id,
    phase: 'persona',
    session_id: response.sessionId,
    token_input: response.usage.inputTokens,
    token_output: response.usage.outputTokens,
    duration_ms: response.durationMs,
    output_raw: response.result,
    output_summary: `${personas.length}名の探索ペルソナを選出`,
  })

  return {
    personas,
    sessionId: response.sessionId,
    tokenInput: response.usage.inputTokens,
    tokenOutput: response.usage.outputTokens,
    durationMs: response.durationMs,
  }
}
