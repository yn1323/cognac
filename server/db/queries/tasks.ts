// タスクのCRUD操作
// 基本的なやつ全部入り

import type Database from 'better-sqlite3'
import type { Task } from '@cognac/shared'

/**
 * タスクを作成する
 * デフォルトはpendingステータスで優先度0
 */
export function createTask(
  db: Database.Database,
  data: { title: string; description?: string; priority?: number },
): Task {
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, priority)
    VALUES (@title, @description, @priority)
  `)

  const result = stmt.run({
    title: data.title,
    description: data.description ?? null,
    priority: data.priority ?? 0,
  })

  // 作ったばかりのタスクを返す
  return getTask(db, Number(result.lastInsertRowid))!
}

/**
 * タスクを1件取得する
 * なかったらundefined
 */
export function getTask(db: Database.Database, id: number): Task | undefined {
  const stmt = db.prepare(`SELECT * FROM tasks WHERE id = ?`)
  return stmt.get(id) as Task | undefined
}

/**
 * タスク一覧を取得する
 * 作成日時の新しい順で返す
 */
export function listTasks(db: Database.Database): Task[] {
  const stmt = db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC`)
  return stmt.all() as Task[]
}

/**
 * タスクを更新する
 * 渡されたフィールドだけ更新して、更新後のタスクを返す
 */
export function updateTask(
  db: Database.Database,
  id: number,
  data: Partial<{
    title: string
    description: string
    status: string
    priority: number
    queue_order: number
    branch_name: string | null
    retry_count: number
    process_retry_count: number
    paused_reason: string | null
    paused_phase: string | null
    started_at: string | null
    completed_at: string | null
  }>,
): Task | undefined {
  // 更新するカラムだけ動的にSET句を組み立てる
  const entries = Object.entries(data).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return getTask(db, id)

  const setClauses = entries.map(([key]) => `${key} = @${key}`).join(', ')
  const stmt = db.prepare(`UPDATE tasks SET ${setClauses} WHERE id = @id`)

  const params: Record<string, unknown> = { id }
  for (const [key, value] of entries) {
    params[key] = value
  }

  const result = stmt.run(params)
  if (result.changes === 0) return undefined

  return getTask(db, id)
}

/**
 * タスクを削除する
 * 消えたらtrue、なかったらfalse
 */
export function deleteTask(db: Database.Database, id: number): boolean {
  const stmt = db.prepare(`DELETE FROM tasks WHERE id = ?`)
  const result = stmt.run(id)
  return result.changes > 0
}

/**
 * 次に処理すべきpendingタスクを取得する
 * queue_orderが小さい順、NULLは後回し、同じならcreated_atが古い順
 */
export function getNextPendingTask(db: Database.Database): Task | undefined {
  const stmt = db.prepare(`
    SELECT * FROM tasks
    WHERE status = 'pending'
    ORDER BY queue_order ASC NULLS LAST, created_at ASC
    LIMIT 1
  `)
  return stmt.get() as Task | undefined
}

/**
 * 全pendingタスクをstoppedにする
 * シャットダウン時とかに使うやつ
 */
export function stopPendingTasks(db: Database.Database): void {
  const stmt = db.prepare(`
    UPDATE tasks SET status = 'stopped' WHERE status = 'pending'
  `)
  stmt.run()
}
