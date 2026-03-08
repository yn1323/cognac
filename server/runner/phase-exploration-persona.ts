import type Database from 'better-sqlite3'
import type {
  CognacConfig,
  ExplorationImage,
  ExplorationPersona,
  ExplorationSession,
  PersonaSelection,
} from '@cognac/shared'
import { createProvider } from './providers/index.js'
import { extractJson } from './json-parser.js'
import { getRepoStructure } from './context-cache.js'
import * as personaQueries from '../db/queries/exploration-personas.js'
import * as logQueries from '../db/queries/exploration-logs.js'

function buildSystemPrompt(config: CognacConfig): string {
  return `あなたは探索チームのリーダーだ。
依頼内容を見て、最適な専門家チーム（${config.discussion.minPersonas}〜${config.discussion.maxPersonas}名）を選出して。

各メンバーには以下を設定して:
- id: kebab-case の識別子
- name: 日本語の役割名
- focus: この探索で注目する観点
- tone: 議論時のキャラクター

Playwright MCP を使う可能性がある場合は、UI検証や再現観点に強いメンバーを含めて。

必ずJSONだけを返して。

\`\`\`json
{
  "personas": [
    { "id": "ux-researcher", "name": "UXリサーチャー", "focus": "画面挙動とユーザー体験の確認", "tone": "観察が細かく、気になる挙動をどんどん拾う" }
  ],
  "estimatedRounds": 2
}
\`\`\`
`
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
      },
      {
        id: 'qa-engineer',
        name: 'QAエンジニア',
        focus: '再現確認、観測ポイント、抜け漏れ検知',
        tone: '慎重派で、再現条件の穴を見つける',
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

  let response = { result: '', sessionId: '', usage: { inputTokens: 0, outputTokens: 0 }, durationMs: 0 }
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
