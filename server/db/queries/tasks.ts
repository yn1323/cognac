// タスクのCRUD操作
// 基本的なやつ全部入り

import type { Task } from '@cognac/shared'
import type { CognacDb } from '../types.js'

/**
 * タスクを作成する
 * デフォルトはpendingステータスで優先度0
 */
export function createTask(
  db: CognacDb,
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
  return getTask(db, Number(result.lastInsertRowid)) as Task
}

/**
 * タスクを1件取得する
 * なかったらundefined
 */
export function getTask(db: CognacDb, id: number): Task | undefined {
  const stmt = db.prepare(`SELECT * FROM tasks WHERE id = ?`)
  return stmt.get(id) as unknown as Task | undefined
}

/**
 * タスク一覧を取得する
 * 作成日時の新しい順で返す
 */
export function listTasks(db: CognacDb): Task[] {
  const stmt = db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC`)
  return stmt.all() as unknown as Task[]
}

/**
 * タスクを更新する
 * 渡されたフィールドだけ更新して、更新後のタスクを返す
 */
export function updateTask(
  db: CognacDb,
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
export function deleteTask(db: CognacDb, id: number): boolean {
  const stmt = db.prepare(`DELETE FROM tasks WHERE id = ?`)
  const result = stmt.run(id)
  return Number(result.changes) > 0
}

/**
 * 次に処理すべきpendingタスクを取得する
 * queue_orderが小さい順、NULLは後回し、同じならcreated_atが古い順
 */
export function getNextPendingTask(db: CognacDb): Task | undefined {
  const stmt = db.prepare(`
    SELECT * FROM tasks
    WHERE status = 'pending'
    ORDER BY queue_order ASC NULLS LAST, created_at ASC
    LIMIT 1
  `)
  return stmt.get() as unknown as Task | undefined
}

/**
 * 全pendingタスクをstoppedにする
 * シャットダウン時とかに使うやつ
 */
export function stopPendingTasks(db: CognacDb): void {
  const stmt = db.prepare(`
    UPDATE tasks SET status = 'stopped', completed_at = datetime('now') WHERE status = 'pending'
  `)
  stmt.run()
}

/**
 * アクティブな全タスクをstoppedにする
 * ユーザーが「全停止」ボタンを押したときに使うやつ
 */
export function stopAllActiveTasks(db: CognacDb): number {
  const stmt = db.prepare(`
    UPDATE tasks
    SET status = 'stopped', paused_reason = 'ユーザーによる全停止', completed_at = datetime('now')
    WHERE status IN ('pending', 'discussing', 'executing', 'reviewing')
  `)
  const result = stmt.run()
  return Number(result.changes)
}
