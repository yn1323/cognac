import type {
  CognacConfig,
  ExplorationArtifact,
  ExplorationDiscussion,
  ExplorationImage,
  ExplorationPersona,
  ExplorationReportResult,
  ExplorationSession,
} from '@cognac/shared'
import * as artifactQueries from '../db/queries/exploration-artifacts.js'
import * as logQueries from '../db/queries/exploration-logs.js'
import type { CognacDb } from '../db/types.js'
import { formatDiscussions } from './discussion-utils.js'
import { parseExplorationReportResult } from './exploration-output.js'
import { createProvider } from './providers/index.js'

function buildSystemPrompt(): string {
  return `あなたは探索結果レポートをまとめる担当だ。
必ず以下の 5 セクションを含む Markdown を作って。

- ## 結論
- ## 調査内容
- ## ディスカッション要約
- ## 課題
- ## 次アクション

返答は JSON だけにして。
severity は必ず "low" | "medium" | "high" のいずれかを指定して。

\`\`\`json
{
  "reportMarkdown": "## 結論\\n...",
  "findings": [
    { "title": "課題タイトル", "detail": "詳細", "severity": "medium" }
  ],
  "nextActions": ["次アクション"]
}
\`\`\`
`
}

function buildUserPrompt(
  exploration: ExplorationSession,
  personas: ExplorationPersona[],
  discussions: ExplorationDiscussion[],
  summaryArtifact: ExplorationArtifact | undefined,
  findings: ExplorationArtifact[],
  images: ExplorationImage[],
): string {
  let prompt = `## 探索依頼

**タイトル**: ${exploration.title}
**本文**: ${exploration.request}

## ペルソナ
${personas.map((persona) => `- ${persona.name}: ${persona.focus}`).join('\n')}

## ディスカッション
${formatDiscussions(discussions)}

## 探索サマリー
${summaryArtifact?.content_text ?? 'なし'}

## 課題メモ
${findings.map((artifact) => `- ${artifact.title}: ${artifact.content_text ?? ''}`).join('\n') || 'なし'}
`

  if (images.length > 0) {
    prompt += '\n## 証跡画像\n'
    for (const image of images) {
      prompt += `- ${image.file_path}\n`
    }
  }

  prompt += '\n\nこの内容から最終レポートをまとめて。'
  return prompt
}

function appendEvidenceSection(markdown: string, images: ExplorationImage[]): string {
  if (images.length === 0) return markdown
  const evidenceLines = images.map((image) => `- ${image.file_path}`).join('\n')
  return `${markdown.trim()}\n\n### 証跡画像\n${evidenceLines}\n`
}

export async function executeExplorationPhaseReport(
  exploration: ExplorationSession,
  personas: ExplorationPersona[],
  discussions: ExplorationDiscussion[],
  summaryArtifact: ExplorationArtifact | undefined,
  findings: ExplorationArtifact[],
  evidenceImages: ExplorationImage[],
  db: CognacDb,
  config: CognacConfig,
  signal?: AbortSignal,
): Promise<{
  report: ExplorationReportResult
  finalMarkdown: string
  sessionId: string
  tokenInput: number
  tokenOutput: number
  durationMs: number
}> {
  const provider = createProvider(config.provider)
  const systemPrompt = buildSystemPrompt()
  const prompt = buildUserPrompt(
    exploration,
    personas,
    discussions,
    summaryArtifact,
    findings,
    evidenceImages,
  )

  const response = await provider.execPrint({ prompt, systemPrompt, signal }, config)
  const report = parseExplorationReportResult(response.result)

  const finalMarkdown = appendEvidenceSection(report.reportMarkdown, evidenceImages)

  artifactQueries.createExplorationArtifact(db, {
    exploration_session_id: exploration.id,
    kind: 'report',
    title: '最終レポート',
    content_text: finalMarkdown,
  })

  logQueries.createExplorationLog(db, {
    exploration_session_id: exploration.id,
    phase: 'report',
    session_id: response.sessionId,
    token_input: response.usage.inputTokens,
    token_output: response.usage.outputTokens,
    duration_ms: response.durationMs,
    output_raw: response.result,
    output_summary: '最終レポート生成',
  })

  return {
    report,
    finalMarkdown,
    sessionId: response.sessionId,
    tokenInput: response.usage.inputTokens,
    tokenOutput: response.usage.outputTokens,
    durationMs: response.durationMs,
  }
}
