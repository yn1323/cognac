import type Database from 'better-sqlite3'
import type {
  CognacConfig,
  DiscussionRound,
  ExplorationDiscussion,
  ExplorationEvent,
  ExplorationImage,
  ExplorationPersona,
  ExplorationSession,
} from '@cognac/shared'
import { createProvider } from './providers/index.js'
import { extractJson } from './json-parser.js'
import { getRepoStructure } from './context-cache.js'
import { groupDiscussionsByRound } from './discussion-utils.js'
import * as discussionQueries from '../db/queries/exploration-discussions.js'
import * as logQueries from '../db/queries/exploration-logs.js'

function formatPersonas(personas: ExplorationPersona[]): string {
  return personas
    .map((persona) => `- **${persona.name}** (${persona.persona_id}): ${persona.focus}。スタイル: ${persona.tone}`)
    .join('\n')
}

function buildSystemPrompt(personas: ExplorationPersona[]): string {
  return `あなたは以下の専門家チーム全員をロールプレイして、探索方針をディスカッションして。

## チームメンバー
${formatPersonas(personas)}

## ルール
- 1人1〜3文で短くテンポよく話す
- 何を調べるべきかを具体化する
- Playwright MCP を使うべきかを判断する
- 証跡として何を残すべきかを話し合う
- 最後は課題と次アクションの粒度まで揃える

必ずJSONだけを返して。

\`\`\`json
{
  "round": 1,
  "messages": [
    { "personaId": "qa-engineer", "content": "まず再現条件を切り分けたいね" }
  ],
  "shouldContinue": true,
  "reason": "まだ観測手段が固まっていない"
}
\`\`\`
`
}

function buildRoundPrompt(
  exploration: ExplorationSession,
  images: ExplorationImage[],
  round: number,
  repoStructure: string,
  previousRounds: ExplorationDiscussion[],
  isLastRound: boolean,
): string {
  let prompt = `## 探索依頼

**タイトル**: ${exploration.title}
**本文**: ${exploration.request}

${repoStructure}
`

  if (images.length > 0) {
    prompt += '\n## 添付画像\n'
    for (const image of images) {
      prompt += `- ${image.file_path}\n`
    }
  }

  prompt += `\n## ラウンド ${round}\n`

  if (round === 1) {
    prompt += '\nこの探索で調べるべきこと、Playwright MCP の必要性、残すべき証跡を議論して。'
  } else {
    prompt += '\n### これまでの会話\n\n'
    const grouped = groupDiscussionsByRound(previousRounds)
    for (const [, discussions] of grouped) {
      for (const discussion of discussions) {
        prompt += `**${discussion.persona_name}**: ${discussion.content}\n`
      }
    }
    prompt += '\nこの続きを話して、必要なら論点を絞って。'
  }

  if (isLastRound) {
    prompt += '\n\n**これが最終ラウンド。shouldContinue は false にして締めて。**'
  }

  return prompt
}

export async function executeExplorationPhaseDiscussion(
  exploration: ExplorationSession,
  personas: ExplorationPersona[],
  images: ExplorationImage[],
  db: Database.Database,
  config: CognacConfig,
  onEvent?: (event: ExplorationEvent) => void,
  signal?: AbortSignal,
): Promise<{
  discussions: ExplorationDiscussion[]
  sessionId: string
  totalTokenInput: number
  totalTokenOutput: number
  totalDurationMs: number
}> {
  const maxRounds = config.discussion.maxRounds
  const provider = createProvider(config.provider)
  const repoStructure = getRepoStructure()
  const systemPrompt = buildSystemPrompt(personas)
  const personaNameMap = new Map(personas.map((persona) => [persona.persona_id, persona.name]))

  const allDiscussions: ExplorationDiscussion[] = []
  let sessionId = ''
  let totalTokenInput = 0
  let totalTokenOutput = 0
  let totalDurationMs = 0

  for (let round = 1; round <= maxRounds; round++) {
    const isLastRound = round === maxRounds
    onEvent?.({ type: 'discussion_round_start', round })
    const userPrompt = buildRoundPrompt(exploration, images, round, repoStructure, allDiscussions, isLastRound)
    let response = { result: '', sessionId: '', usage: { inputTokens: 0, outputTokens: 0 }, durationMs: 0 }
    let discussionRound: DiscussionRound | null = null

    for (let attempt = 0; attempt < 2; attempt++) {
      response = await provider.execPrint({ prompt: userPrompt, systemPrompt, signal }, config)
      try {
        discussionRound = extractJson<DiscussionRound>(response.result)
        if (discussionRound.messages.length > 0) {
          sessionId = response.sessionId || sessionId
          break
        }
        discussionRound = null
      } catch {
        discussionRound = null
      }
    }

    if (!discussionRound) break

    totalTokenInput += response.usage.inputTokens
    totalTokenOutput += response.usage.outputTokens
    totalDurationMs += response.durationMs

    if (isLastRound) {
      discussionRound.shouldContinue = false
    }

    const discussions = discussionQueries.createExplorationDiscussionStatements(
      db,
      exploration.id,
      round,
      discussionRound.messages.map((message) => ({
        persona_id: message.personaId,
        persona_name: personaNameMap.get(message.personaId) ?? message.personaId,
        content: message.content,
        key_points: null,
        should_continue: discussionRound!.shouldContinue,
        continue_reason: discussionRound!.reason ?? null,
      })),
    )
    allDiscussions.push(...discussions)

    for (const message of discussionRound.messages) {
      onEvent?.({
        type: 'discussion_statement',
        round,
        personaId: message.personaId,
        personaName: personaNameMap.get(message.personaId) ?? message.personaId,
        content: message.content,
      })
    }

    onEvent?.({
      type: 'discussion_round_end',
      round,
      shouldContinue: discussionRound.shouldContinue,
      reason: discussionRound.reason ?? '',
    })

    logQueries.createExplorationLog(db, {
      exploration_session_id: exploration.id,
      phase: 'discussion',
      session_id: response.sessionId,
      token_input: response.usage.inputTokens,
      token_output: response.usage.outputTokens,
      duration_ms: response.durationMs,
      output_summary: `ラウンド${round}: ${discussionRound.messages.length}メッセージ`,
    })

    if (!discussionRound.shouldContinue) break
  }

  return {
    discussions: allDiscussions,
    sessionId,
    totalTokenInput,
    totalTokenOutput,
    totalDurationMs,
  }
}
