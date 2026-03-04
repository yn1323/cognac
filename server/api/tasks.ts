import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import * as taskQueries from '../db/queries/tasks.js'
import * as taskImageQueries from '../db/queries/task-images.js'
import * as logQueries from '../db/queries/execution-logs.js'

// バリデーションスキーマ
const createTaskSchema = z.object({
  title: z.string().min(2, 'タイトルは2文字以上で入力してね').max(200, 'タイトルは200文字以内にしてね'),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(3).optional(),
})

const updateTaskSchema = z.object({
  title: z.string().min(2, 'タイトルは2文字以上で入力してね').max(200, 'タイトルは200文字以内にしてね').optional(),
  description: z.string().optional(),
  priority: z.number().int().optional(),
  queue_order: z.number().int().optional(),
})

// 画像アップロードの制限
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 5
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]

export function tasksRouter(db: Database.Database) {
  const app = new Hono()

  // タスク一覧
  app.get('/', (c) => {
    const tasks = taskQueries.listTasks(db)
    return c.json(tasks)
  })

  // タスク取得
  app.get('/:id', (c) => {
    const id = Number(c.req.param('id'))
    const task = taskQueries.getTask(db, id)
    if (!task) {
      return c.json({ error: 'タスクが見つからない' }, 404)
    }
    return c.json(task)
  })

  // タスク作成
  app.post('/', async (c) => {
    const body = await c.req.json()
    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }
    const task = taskQueries.createTask(db, parsed.data)
    return c.json(task, 201)
  })

  // 画像アップロード
  app.post('/:id/images', async (c) => {
    const id = Number(c.req.param('id'))
    const task = taskQueries.getTask(db, id)
    if (!task) {
      return c.json({ error: 'タスクが見つからない' }, 404)
    }

    const formData = await c.req.formData()
    const files = formData.getAll('images') as File[]

    if (files.length === 0) {
      return c.json({ error: 'ファイルが選択されてない' }, 400)
    }
    if (files.length > MAX_FILES) {
      return c.json({ error: `最大${MAX_FILES}ファイルまで` }, 400)
    }

    // バリデーション（全ファイルを先に検証してから書き込む）
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return c.json({ error: `非対応のファイル形式: ${file.type}` }, 400)
      }
      if (file.size > MAX_FILE_SIZE) {
        return c.json({ error: `ファイルサイズが大きすぎ: ${file.name} (上限5MB)` }, 400)
      }
    }

    // 書き込み（バリデーション通過後にディスクI/Oを並列実行）
    const uploadDir = resolve('.cognac', 'uploads', String(id))
    await mkdir(uploadDir, { recursive: true })

    const savedImages = await Promise.all(
      files.map(async (file) => {
        const ext = extname(file.name) || '.bin'
        const savedName = `${randomUUID()}${ext}`
        const diskPath = resolve(uploadDir, savedName)
        const urlPath = `uploads/${id}/${savedName}`

        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(diskPath, buffer)

        return taskImageQueries.createTaskImage(db, {
          task_id: id,
          file_path: urlPath,
          original_name: file.name,
          mime_type: file.type,
        })
      }),
    )

    return c.json(savedImages, 201)
  })

  // 画像一覧
  app.get('/:id/images', (c) => {
    const id = Number(c.req.param('id'))
    return c.json(taskImageQueries.listTaskImages(db, id))
  })

  // 画像削除
  app.delete('/:id/images/:imageId', async (c) => {
    const taskId = Number(c.req.param('id'))
    const imageId = Number(c.req.param('imageId'))

    const image = taskImageQueries.getTaskImage(db, imageId)
    if (!image || image.task_id !== taskId) {
      return c.json({ error: '画像が見つからない' }, 404)
    }

    // ファイルをディスクから削除
    try {
      await unlink(resolve('.cognac', image.file_path))
    } catch {
      // ファイルが既に消えてても気にしない
    }

    taskImageQueries.deleteTaskImage(db, imageId)
    return c.json({ ok: true })
  })

  // 実行ログ一覧
  app.get('/:id/logs', (c) => {
    const id = Number(c.req.param('id'))
    const task = taskQueries.getTask(db, id)
    if (!task) {
      return c.json({ error: 'タスクが見つからない' }, 404)
    }
    const logs = logQueries.getLogsByTaskId(db, id)
    return c.json(logs)
  })

  // タスク更新
  app.put('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const parsed = updateTaskSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }
    const task = taskQueries.updateTask(db, id, parsed.data)
    if (!task) {
      return c.json({ error: 'タスクが見つからない' }, 404)
    }
    return c.json(task)
  })

  // タスクキャンセル（executing中のタスクをstoppedにする）
  app.post('/:id/cancel', (c) => {
    const id = Number(c.req.param('id'))
    const task = taskQueries.getTask(db, id)
    if (!task) {
      return c.json({ error: 'タスクが見つからない' }, 404)
    }
    if (!['executing', 'testing', 'discussing', 'planned'].includes(task.status)) {
      return c.json({ error: 'キャンセルできないステータス' }, 400)
    }
    const updated = taskQueries.updateTask(db, id, {
      status: 'stopped',
      paused_reason: 'ユーザーによるキャンセル',
    })
    return c.json(updated)
  })

  // タスクリトライ（stopped/pausedのタスクをpendingに戻す）
  app.post('/:id/retry', (c) => {
    const id = Number(c.req.param('id'))
    const task = taskQueries.getTask(db, id)
    if (!task) {
      return c.json({ error: 'タスクが見つからない' }, 404)
    }
    if (!['stopped', 'paused'].includes(task.status)) {
      return c.json({ error: 'リトライできないステータス' }, 400)
    }
    const updated = taskQueries.updateTask(db, id, {
      status: 'pending',
      retry_count: 0,
      process_retry_count: 0,
      branch_name: null,
      paused_reason: null,
      paused_phase: null,
      started_at: null,
      completed_at: null,
    })
    return c.json(updated)
  })

  // タスク削除（pending/stopped/completedのみ）
  app.delete('/:id', (c) => {
    const id = Number(c.req.param('id'))
    const task = taskQueries.getTask(db, id)
    if (!task) {
      return c.json({ error: 'タスクが見つからない' }, 404)
    }
    if (!['pending', 'stopped', 'completed'].includes(task.status)) {
      return c.json({ error: '実行中のタスクは削除できない' }, 400)
    }
    taskQueries.deleteTask(db, id)
    return c.json({ ok: true })
  })

  return app
}
