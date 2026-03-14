import { randomUUID } from 'node:crypto'
import { mkdir, rm, unlink, writeFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import type { ExplorationEvent, ExplorationStatus } from '@cognac/shared'
import type Database from 'better-sqlite3'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import * as explorationArtifactQueries from '../db/queries/exploration-artifacts.js'
import * as explorationDiscussionQueries from '../db/queries/exploration-discussions.js'
import * as explorationEventQueries from '../db/queries/exploration-events.js'
import * as explorationImageQueries from '../db/queries/exploration-images.js'
import * as explorationLogQueries from '../db/queries/exploration-logs.js'
import * as explorationPersonaQueries from '../db/queries/exploration-personas.js'
import * as explorationTaskifyJobQueries from '../db/queries/exploration-taskify-jobs.js'
import * as explorationQueries from '../db/queries/explorations.js'
import {
  getExplorationArtifactDir,
  getExplorationUploadDir,
  resolveCognacPath,
} from '../runner/exploration-paths.js'
import type { EventBus } from '../sse/event-bus.js'

const createExplorationSchema = z.object({
  title: z
    .string()
    .min(2, 'タイトルは2文字以上で入力してね')
    .max(200, 'タイトルは200文字以内にしてね'),
  request: z.string().min(2, '本文は2文字以上で入力してね'),
})

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_FILES = 5
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

async function saveExplorationImages(
  db: Database.Database,
  explorationId: number,
  files: File[],
): Promise<void> {
  if (files.length === 0) return
  if (files.length > MAX_FILES) {
    throw new Error(`最大${MAX_FILES}ファイルまで`)
  }

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`非対応のファイル形式: ${file.type}`)
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`ファイルサイズが大きすぎ: ${file.name} (上限5MB)`)
    }
  }

  const uploadDir = getExplorationUploadDir(explorationId)
  await mkdir(uploadDir, { recursive: true })

  const savedImages = await Promise.all(
    files.map(async (file) => {
      const ext = extname(file.name) || '.bin'
      const savedName = `${randomUUID()}${ext}`
      const diskPath = resolve(uploadDir, savedName)
      const relativePath = `uploads/explorations/${explorationId}/${savedName}`
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(diskPath, buffer)

      return {
        exploration_session_id: explorationId,
        source_type: 'user' as const,
        file_path: relativePath,
        original_name: file.name,
        mime_type: file.type,
      }
    }),
  )

  explorationImageQueries.createExplorationImages(db, savedImages)
}

function resetExplorationForRetry(db: Database.Database, explorationId: number) {
  const resetInTransaction = db.transaction(() => {
    explorationPersonaQueries.deleteExplorationPersonasBySessionId(db, explorationId)
    explorationDiscussionQueries.deleteExplorationDiscussionsBySessionId(db, explorationId)
    explorationArtifactQueries.deleteExplorationArtifactsBySessionId(db, explorationId)
    explorationLogQueries.deleteExplorationLogsBySessionId(db, explorationId)
    explorationTaskifyJobQueries.deleteExplorationTaskifyJobsBySessionId(db, explorationId)
    explorationEventQueries.deleteEventsByExplorationId(db, explorationId)
    explorationImageQueries.deleteExplorationImagesBySourceType(db, explorationId, 'playwright')

    return explorationQueries.updateExploration(db, explorationId, {
      status: 'pending',
      final_report_markdown: null,
      issue_count: 0,
      paused_reason: null,
      started_at: null,
      completed_at: null,
    })
  })

  return resetInTransaction()
}

export interface ExplorationCanceller {
  cancelCurrentExploration(explorationId: number): boolean
}

const updateExplorationSchema = z.object({
  title: z
    .string()
    .min(2, 'タイトルは2文字以上で入力してね')
    .max(200, 'タイトルは200文字以内にしてね')
    .optional(),
  request: z.string().min(2, '本文は2文字以上で入力してね').optional(),
})

export function explorationsRouter(
  db: Database.Database,
  eventBus: EventBus<ExplorationEvent>,
  canceller?: ExplorationCanceller,
) {
  const app = new Hono()

  app.get('/', (c) => {
    return c.json(explorationQueries.listExplorations(db))
  })

  app.post('/', async (c) => {
    const contentType = c.req.header('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData()
      const parsed = createExplorationSchema.safeParse({
        title: formData.get('title'),
        request: formData.get('request'),
      })
      if (!parsed.success) {
        return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
      }

      const exploration = explorationQueries.createExploration(db, parsed.data)
      const files = formData
        .getAll('images')
        .filter((value): value is File => value instanceof File)
      try {
        await saveExplorationImages(db, exploration.id, files)
      } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : String(error) }, 400)
      }
      return c.json(explorationQueries.getExploration(db, exploration.id), 201)
    }

    const body = await c.req.json()
    const parsed = createExplorationSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }
    const exploration = explorationQueries.createExploration(db, parsed.data)
    return c.json(exploration, 201)
  })

  app.get('/:id', (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    return c.json({
      ...exploration,
      latestTaskifyJob:
        explorationTaskifyJobQueries.getLatestExplorationTaskifyJobBySessionId(db, id) ?? null,
    })
  })

  app.get('/:id/images', (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    return c.json(explorationImageQueries.listExplorationImages(db, id))
  })

  app.get('/:id/personas', (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    return c.json(explorationPersonaQueries.getExplorationPersonasBySessionId(db, id))
  })

  app.get('/:id/discussions', (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    return c.json(explorationDiscussionQueries.getExplorationDiscussionsBySessionId(db, id))
  })

  app.get('/:id/logs', (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    return c.json(explorationLogQueries.getExplorationLogsBySessionId(db, id))
  })

  // 探索イベント一覧（個別イベントの永続化データ）
  app.get('/:id/events', (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    const events = explorationEventQueries.getEventsByExplorationId(db, id)
    return c.json(events.map((row) => JSON.parse(row.event_data)))
  })

  app.get('/:id/artifacts', (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    return c.json(explorationArtifactQueries.listExplorationArtifacts(db, id))
  })

  app.get('/:id/report', (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    return c.json({
      markdown: exploration.final_report_markdown,
      issueCount: exploration.issue_count,
      evidenceImages: explorationArtifactQueries.listExplorationEvidenceImages(db, id),
    })
  })

  app.post('/:id/retry', async (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    const retryableStatuses: ExplorationStatus[] = ['paused', 'stopped']
    if (!retryableStatuses.includes(exploration.status)) {
      return c.json({ error: 'リトライできないステータス' }, 400)
    }

    await rm(getExplorationArtifactDir(id), { recursive: true, force: true })

    const updated = resetExplorationForRetry(db, id)
    return c.json(updated)
  })

  app.post('/:id/taskify', async (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    if (exploration.status !== 'completed') {
      return c.json({ error: '完了済みの探索だけタスク化できる' }, 400)
    }
    if (explorationTaskifyJobQueries.hasActiveExplorationTaskifyJob(db, id)) {
      return c.json({ error: '進行中の taskify ジョブがある' }, 409)
    }

    // bodyからuserInstructionを取得（bodyが空でもOK）
    const taskifyBodySchema = z.object({ userInstruction: z.string().optional() }).optional()
    let userInstruction: string | undefined
    try {
      const body = await c.req.json()
      const parsed = taskifyBodySchema.safeParse(body)
      if (parsed.success) {
        userInstruction = parsed.data?.userInstruction
      }
    } catch {
      // bodyが空の場合は無視
    }

    const job = explorationTaskifyJobQueries.createExplorationTaskifyJob(db, id, userInstruction)
    return c.json(job, 202)
  })

  app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    const activeStatuses: ExplorationStatus[] = ['discussing', 'executing', 'reviewing']
    if (activeStatuses.includes(exploration.status)) {
      return c.json({ error: '実行中の探索は削除できない' }, 400)
    }
    if (explorationTaskifyJobQueries.hasActiveExplorationTaskifyJob(db, id)) {
      return c.json({ error: 'taskify 実行中の探索は削除できない' }, 400)
    }

    await Promise.all([
      rm(getExplorationUploadDir(id), { recursive: true, force: true }),
      rm(getExplorationArtifactDir(id), { recursive: true, force: true }),
    ])

    explorationQueries.deleteExploration(db, id)
    return c.json({ ok: true })
  })

  app.delete('/:id/images/:imageId', async (c) => {
    const explorationId = Number(c.req.param('id'))
    const imageId = Number(c.req.param('imageId'))
    const image = explorationImageQueries.getExplorationImage(db, explorationId, imageId)

    if (!image) return c.json({ error: '画像が見つからない' }, 404)

    try {
      await unlink(resolveCognacPath(image.file_path))
    } catch {
      // 既にない場合は無視
    }

    db.prepare('DELETE FROM exploration_images WHERE id = ?').run(imageId)
    return c.json({ ok: true })
  })

  app.post('/:id/cancel', (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    const cancelableStatuses: ExplorationStatus[] = ['discussing', 'executing', 'reviewing']
    if (!cancelableStatuses.includes(exploration.status)) {
      return c.json({ error: 'キャンセルできないステータス' }, 400)
    }
    canceller?.cancelCurrentExploration(id)
    const updated = explorationQueries.updateExploration(db, id, {
      status: 'stopped',
      paused_reason: 'ユーザーによるキャンセル',
    })
    return c.json(updated)
  })

  app.put('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const exploration = explorationQueries.getExploration(db, id)
    if (!exploration) return c.json({ error: '探索が見つからない' }, 404)
    const editableStatuses: ExplorationStatus[] = ['pending', 'completed', 'paused', 'stopped']
    if (!editableStatuses.includes(exploration.status)) {
      return c.json({ error: '実行中の探索は編集できない' }, 400)
    }
    const body = await c.req.json()
    const parsed = updateExplorationSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }
    const updated = explorationQueries.updateExploration(db, id, parsed.data)
    if (!updated) return c.json({ error: '更新に失敗した' }, 500)
    return c.json(updated)
  })

  app.get('/:id/stream', (c) => {
    const explorationId = Number(c.req.param('id'))

    return streamSSE(c, async (stream) => {
      const { promise, resolve } = Promise.withResolvers<void>()

      // リプレイ中のライブイベントをバッファリング
      const liveBuffer: ExplorationEvent[] = []
      let buffering = true

      const unsubscribe = eventBus.subscribe(explorationId, (event) => {
        if (buffering) {
          liveBuffer.push(event)
        } else {
          stream.writeSSE({ data: JSON.stringify(event), event: event.type })
        }

        if (event.type === 'completed' || event.type === 'error') {
          resolve()
        }
      })

      // DB既存イベントをリプレイ送信（JSON parse不要、event_dataをそのまま使用）
      const existingEvents = explorationEventQueries.getEventsByExplorationId(db, explorationId)
      for (const row of existingEvents) {
        await stream.writeSSE({ data: row.event_data, event: row.event_type })
      }

      // バッファリング終了 → バッファ内のライブイベントをフラッシュ
      buffering = false
      for (const event of liveBuffer) {
        await stream.writeSSE({ data: JSON.stringify(event), event: event.type })
      }

      stream.onAbort(() => {
        unsubscribe()
        resolve()
      })

      await promise
      unsubscribe()
    })
  })

  return app
}
