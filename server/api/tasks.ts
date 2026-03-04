import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import * as taskQueries from '../db/queries/tasks.js'
import * as taskImageQueries from '../db/queries/task-images.js'

// バリデーションスキーマ
const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(3).optional(),
})

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
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

    // 書き込み（バリデーション通過後に実行）
    const uploadDir = resolve('.cognac', 'uploads', String(id))
    await mkdir(uploadDir, { recursive: true })

    const savedImages = []
    for (const file of files) {
      const ext = extname(file.name) || '.bin'
      const savedName = `${randomUUID()}${ext}`
      const filePath = resolve(uploadDir, savedName)

      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)

      const image = taskImageQueries.createTaskImage(db, {
        task_id: id,
        file_path: filePath,
        original_name: file.name,
        mime_type: file.type,
      })
      savedImages.push(image)
    }

    return c.json(savedImages, 201)
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
