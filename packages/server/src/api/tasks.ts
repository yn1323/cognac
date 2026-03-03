import { Hono } from 'hono'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import * as taskQueries from '../db/queries/tasks.js'

// バリデーションスキーマ
const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
})

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.number().int().optional(),
  queue_order: z.number().int().optional(),
})

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
