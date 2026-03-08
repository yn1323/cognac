import { copyFile, mkdir } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  CognacConfig,
  ExplorationArtifact,
  ExplorationImage,
  ExplorationSession,
  ExplorationTaskifyJob,
  ExplorationTaskifyResult,
} from '@cognac/shared'
import { createProvider } from './providers/index.js'
import { extractJson } from './json-parser.js'
import * as artifactQueries from '../db/queries/exploration-artifacts.js'
import * as logQueries from '../db/queries/exploration-logs.js'
import * as taskQueries from '../db/queries/tasks.js'
import * as taskImageQueries from '../db/queries/task-images.js'
import { getCognacRoot, resolveCognacPath } from './exploration-paths.js'

function buildSystemPrompt(): string {
  return `あなたは探索レポートを実装タスクへ分解する担当だ。
課題を粒度よく分けて、各タスクに必要な画像だけを選んで。

JSONだけを返して。

\`\`\`json
{
  "tasks": [
    {
      "title": "タスクタイトル",
      "description": "タスク説明",
      "priority": 1,
      "selectedImageIds": [1],
      "sourceFindingTitles": ["課題タイトル"]
    }
  ]
}
\`\`\`
`
}

function buildUserPrompt(
  exploration: ExplorationSession,
  reportArtifact: ExplorationArtifact | undefined,
  findings: ExplorationArtifact[],
  images: ExplorationImage[],
): string {
  return `## 探索依頼
**タイトル**: ${exploration.title}

## 最終レポート
${reportArtifact?.content_text ?? exploration.final_report_markdown ?? 'なし'}

## 課題
${findings.map((artifact) => `- ${artifact.title}: ${artifact.content_text ?? ''}`).join('\n') || 'なし'}

## 利用可能な画像
${images.map((image) => `- id=${image.id} path=${image.file_path}`).join('\n') || 'なし'}

複数タスクに分解して。priority は 0〜3 で返して。`
}

function getFallbackTaskifyResult(exploration: ExplorationSession): ExplorationTaskifyResult {
  return {
    tasks: [
      {
        title: exploration.title,
        description: exploration.final_report_markdown ?? exploration.request,
        priority: 1,
        selectedImageIds: [],
        sourceFindingTitles: [],
      },
    ],
  }
}

export async function executeExplorationPhaseTaskify(
  exploration: ExplorationSession,
  job: ExplorationTaskifyJob,
  findings: ExplorationArtifact[],
  reportArtifact: ExplorationArtifact | undefined,
  images: ExplorationImage[],
  db: Database.Database,
  config: CognacConfig,
  cwd: string,
  signal?: AbortSignal,
): Promise<{ taskIds: number[]; resultJson: string }> {
  const provider = createProvider(config.provider)
  const systemPrompt = buildSystemPrompt()
  const prompt = buildUserPrompt(exploration, reportArtifact, findings, images)

  const response = await provider.execPrint({ prompt, systemPrompt, signal }, config)

  let taskifyResult: ExplorationTaskifyResult
  try {
    taskifyResult = extractJson<ExplorationTaskifyResult>(response.result)
  } catch {
    taskifyResult = getFallbackTaskifyResult(exploration)
  }

  const imageMap = new Map(images.map((image) => [image.id, image]))
  const taskIds: number[] = []

  for (const taskInput of taskifyResult.tasks) {
    const task = taskQueries.createTask(db, {
      title: taskInput.title,
      description: taskInput.description,
      priority: Math.max(0, Math.min(3, taskInput.priority)),
    })
    taskIds.push(task.id)

    const targetDir = resolve(getCognacRoot(cwd), 'uploads', String(task.id))
    await mkdir(targetDir, { recursive: true })

    for (const imageId of taskInput.selectedImageIds) {
      const image = imageMap.get(imageId)
      if (!image) continue
      const ext = extname(image.file_path) || '.bin'
      const savedName = `${randomUUID()}${ext}`
      const targetPath = resolve(targetDir, savedName)

      await copyFile(resolveCognacPath(image.file_path, cwd), targetPath)
      taskImageQueries.createTaskImage(db, {
        task_id: task.id,
        file_path: `uploads/${task.id}/${savedName}`,
        original_name: image.original_name ?? savedName,
        mime_type: image.mime_type,
      })
    }
  }

  const resultJson = JSON.stringify({
    taskIds,
    tasks: taskifyResult.tasks,
    explorationId: exploration.id,
    jobId: job.id,
  })

  artifactQueries.createExplorationArtifact(db, {
    exploration_session_id: exploration.id,
    kind: 'taskify-result',
    title: `taskify job ${job.id}`,
    content_text: resultJson,
  })

  logQueries.createExplorationLog(db, {
    exploration_session_id: exploration.id,
    phase: 'taskify',
    session_id: response.sessionId,
    token_input: response.usage.inputTokens,
    token_output: response.usage.outputTokens,
    duration_ms: response.durationMs,
    output_summary: `${taskIds.length}件のタスクを生成`,
  })

  return { taskIds, resultJson }
}
