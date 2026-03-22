import type {
  CognacConfig,
  DiscussionRound,
  ExplorationDiscussion,
  ExplorationEvent,
  ExplorationImage,
  ExplorationPersona,
  ExplorationSession,
} from '@cognac/shared'
import * as discussionQueries from '../db/queries/exploration-discussions.js'
import * as logQueries from '../db/queries/exploration-logs.js'
import type { CognacDb } from '../db/types.js'
import { getRepoStructure } from './context-cache.js'
import { groupDiscussionsByRound } from './discussion-utils.js'
import { extractJson } from './json-parser.js'
import { createProvider } from './providers/index.js'

function formatPersonas(personas: ExplorationPersona[]): string {
  return personas
    .map(
      (persona) =>
        `- **${persona.name}** (${persona.persona_id}): ${persona.focus}。スタイル: ${persona.tone}`,
    )
    .join('\n')
}

function buildSystemPrompt(personas: ExplorationPersona[]): string {
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

## 探索固有の論点
- 何を調べるべきかを具体化する
- Playwright MCP を使うべきかを判断する
- 証跡として何を残すべきかを話し合う
- 最後は課題と次アクションの粒度まで揃える

必ず以下のJSONフォーマットだけを返して。余計な説明はいらない。

\`\`\`json
{
  "round": 1,
  "messages": [
    { "personaId": "ux-researcher", "content": "この画面、まずユーザーの導線から確認したいんだけど🤔" },
    { "personaId": "qa-engineer", "content": "💡 再現条件から先に切り分けない？\\n環境差分がありそうな気がする" },
    { "personaId": "ux-researcher", "content": "たしかに！じゃあまず再現手順を整理しよう👍" }
  ],
  "shouldContinue": true,
  "reason": "まだ証跡の残し方について議論が必要"
}
\`\`\`

### shouldContinueの判定基準
以下の場合は false にして:
- 全メンバーが主要な論点で合意に達した
- 新しい論点や反論が出なくなった
- 前ラウンドと実質的に同じ議論の繰り返しになった

出力がJSONフォーマットに準拠しているか確認してから返して。`
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
    prompt += '\n探索依頼についてチャットで話し合って。各メンバーの初見の反応から始めて。'
  } else {
    prompt += '\n### これまでの会話\n\n'
    const grouped = groupDiscussionsByRound(previousRounds)
    for (const [, discussions] of grouped) {
      for (const discussion of discussions) {
        prompt += `**${discussion.persona_name}**: ${discussion.content}\n`
      }
    }
    prompt += '\nこの会話の続きをしてくれ。前の話を踏まえて、まだ決まっていない点を議論して。'
  }

  if (isLastRound) {
    prompt +=
      '\n\n**注意: これが最終ラウンドだ。shouldContinueはfalseにして、結論を短くまとめるメッセージで締めてくれ。**'
  }

  return prompt
}

export async function executeExplorationPhaseDiscussion(
  exploration: ExplorationSession,
  personas: ExplorationPersona[],
  images: ExplorationImage[],
  db: CognacDb,
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
  const maxRounds = exploration.discussion_depth ?? config.discussion.maxRounds
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
    const userPrompt = buildRoundPrompt(
      exploration,
      images,
      round,
      repoStructure,
      allDiscussions,
      isLastRound,
    )
    let response = {
      result: '',
      sessionId: '',
      usage: { inputTokens: 0, outputTokens: 0 },
      durationMs: 0,
    }
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
        should_continue: discussionRound?.shouldContinue,
        continue_reason: discussionRound?.reason ?? null,
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
      output_raw: response.result,
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
