// プランのCRUD操作

import type Database from 'better-sqlite3'
import type { Plan } from '@cognac/shared'

/**
 * プランを作成する
 */
export function createPlan(
  db: Database.Database,
  data: {
    task_id: number
    plan_markdown: string
    execution_prompt: string
    personas_used: string // JSON文字列
    total_rounds: number
    estimated_complexity: 'low' | 'medium' | 'high' | null
  },
): Plan {
  const stmt = db.prepare(`
    INSERT INTO plans (
      task_id, plan_markdown, execution_prompt,
      personas_used, total_rounds, estimated_complexity
    )
    VALUES (
      @task_id, @plan_markdown, @execution_prompt,
      @personas_used, @total_rounds, @estimated_complexity
    )
  `)

  const result = stmt.run(data)

  return {
    id: Number(result.lastInsertRowid),
    ...data,
    created_at: new Date().toISOString(),
  }
}

/**
 * タスクIDでプランを取得する（最新のものを返す）
 */
export function getPlanByTaskId(
  db: Database.Database,
  taskId: number,
): Plan | undefined {
  const stmt = db.prepare(
    `SELECT * FROM plans WHERE task_id = ? ORDER BY id DESC LIMIT 1`,
  )
  return stmt.get(taskId) as Plan | undefined
}

/**
 * タスクIDでプランを全削除する（リトライ時のクリーンアップ用）
 */
export function deletePlanByTaskId(
  db: Database.Database,
  taskId: number,
): number {
  const stmt = db.prepare('DELETE FROM plans WHERE task_id = ?')
  return stmt.run(taskId).changes
}
