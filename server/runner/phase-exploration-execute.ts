import { basename, extname } from 'node:path'
import type {
  AgentStreamEvent,
  CognacConfig,
  ExplorationDiscussion,
  ExplorationExecutionResult,
  ExplorationImage,
  ExplorationPersona,
  ExplorationSession,
} from '@cognac/shared'
import type { CognacDb } from '../db/types.js'
import * as artifactQueries from '../db/queries/exploration-artifacts.js'
import * as imageQueries from '../db/queries/exploration-images.js'
import * as logQueries from '../db/queries/exploration-logs.js'
import { formatDiscussions } from './discussion-utils.js'
import { parseExplorationExecutionResult } from './exploration-output.js'
import {
  ensureExplorationDirs,
  getExplorationPlaywrightDir,
  isExistingCognacFile,
} from './exploration-paths.js'
import { createProvider } from './providers/index.js'

function buildSystemPrompt(explorationId: number, cwd: string): string {
  const evidenceDir = getExplorationPlaywrightDir(explorationId, cwd)
  return `あなたは探索担当エンジニアだ。以下の制約で調査して。

## 禁止
- コード修正
- Git 操作
- CI 実行
- Playwright MCP の設定確認やセットアップ

## 方針
- 読み取り中心で進める
- Playwright MCP は必要だと判断した場合だけ使ってよい
- UI確認、画面遷移、再現手順、モンキーテストが必要なら Playwright MCP を検討する
- テキスト調査で十分なら使わない
- 証跡を残す場合は ${evidenceDir} に保存する
- 最後は必ず JSON だけを返す
- severity は必ず "low" | "medium" | "high" のいずれかを指定する

\`\`\`json
{
  "summary": "探索結果の要約",
  "findings": [
    { "title": "課題タイトル", "detail": "詳細", "severity": "medium" }
  ],
  "nextActions": ["次アクション"],
  "evidenceFiles": [".cognac/artifacts/explorations/${explorationId}/playwright/example.png"],
  "playwrightUsed": true
}
\`\`\`
`
}

function buildUserPrompt(
  exploration: ExplorationSession,
  personas: ExplorationPersona[],
  discussions: ExplorationDiscussion[],
  images: ExplorationImage[],
): string {
  let prompt = `## 探索依頼

**タイトル**: ${exploration.title}
**本文**: ${exploration.request}

## ペルソナ
${personas.map((persona) => `- ${persona.name}: ${persona.focus}`).join('\n')}

## ディスカッション要約
${formatDiscussions(discussions)}`

  if (images.length > 0) {
    prompt += '\n## 添付画像\n'
    for (const image of images) {
      prompt += `- ${image.file_path}\n`
    }
  }

  prompt += '\n\n探索を実行して、必要なら Playwright MCP を使って。'
  return prompt
}

function isImagePath(filePath: string): boolean {
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(extname(filePath).toLowerCase())
}

export async function executeExplorationPhaseExplore(
  exploration: ExplorationSession,
  personas: ExplorationPersona[],
  discussions: ExplorationDiscussion[],
  images: ExplorationImage[],
  db: CognacDb,
  config: CognacConfig,
  cwd: string,
  onStream?: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<{
  result: ExplorationExecutionResult
  sessionId: string
  tokenInput: number
  tokenOutput: number
  durationMs: number
}> {
  await ensureExplorationDirs(exploration.id, cwd)

  const provider = createProvider(config.provider)
  const systemPrompt = buildSystemPrompt(exploration.id, cwd)
  const prompt = buildUserPrompt(exploration, personas, discussions, images)

  const response = await provider.execStream(
    {
      prompt,
      systemPrompt,
      executionMode: 'read-only',
      onStream,
      signal,
    },
    config,
  )

  const result = parseExplorationExecutionResult(response.result)

  artifactQueries.createExplorationArtifact(db, {
    exploration_session_id: exploration.id,
    kind: 'plan',
    title: '探索サマリー',
    content_text: result.summary,
  })

  artifactQueries.createExplorationArtifacts(
    db,
    result.findings.map((finding) => ({
      exploration_session_id: exploration.id,
      kind: 'finding' as const,
      title: finding.title,
      content_text: finding.detail,
      metadata_json: JSON.stringify({ severity: finding.severity ?? null }),
    })),
  )

  const evidenceImages: {
    exploration_session_id: number
    source_type: 'playwright'
    file_path: string
    original_name?: string | null
    mime_type: string
  }[] = []

  for (const evidenceFile of result.evidenceFiles) {
    const existing = isExistingCognacFile(evidenceFile, cwd)
    if (!existing) continue

    if (isImagePath(existing.relativePath)) {
      if (
        !imageQueries.findExplorationImageBySessionAndPath(
          db,
          exploration.id,
          existing.relativePath,
        )
      ) {
        evidenceImages.push({
          exploration_session_id: exploration.id,
          source_type: 'playwright',
          file_path: existing.relativePath,
          original_name: basename(existing.relativePath) ?? null,
          mime_type: `image/${extname(existing.relativePath).replace('.', '').replace('jpg', 'jpeg')}`,
        })
      }
      continue
    }

    artifactQueries.createExplorationArtifact(db, {
      exploration_session_id: exploration.id,
      kind: 'playwright-log',
      title: basename(existing.relativePath) ?? existing.relativePath,
      file_path: existing.relativePath,
    })
  }

  imageQueries.createExplorationImages(db, evidenceImages)

  logQueries.createExplorationLog(db, {
    exploration_session_id: exploration.id,
    phase: 'explore',
    session_id: response.sessionId,
    token_input: response.usage.inputTokens,
    token_output: response.usage.outputTokens,
    duration_ms: response.durationMs,
    output_raw: response.result,
    output_summary: result.summary.slice(0, 500),
  })

  return {
    result,
    sessionId: response.sessionId,
    tokenInput: response.usage.inputTokens,
    tokenOutput: response.usage.outputTokens,
    durationMs: response.durationMs,
  }
}
