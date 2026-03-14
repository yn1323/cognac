// プランのCRUD操作

import type { Plan } from '@cognac/shared'
import type { CognacDb } from '../types.js'

/**
 * プランを作成する
 */
export function createPlan(
  db: CognacDb,
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
export function getPlanByTaskId(db: CognacDb, taskId: number): Plan | undefined {
  const stmt = db.prepare(`SELECT * FROM plans WHERE task_id = ? ORDER BY id DESC LIMIT 1`)
  return stmt.get(taskId) as unknown as Plan | undefined
}

/**
 * タスクIDでプランを全削除する（リトライ時のクリーンアップ用）
 */
export function deletePlanByTaskId(db: CognacDb, taskId: number): number {
  const stmt = db.prepare('DELETE FROM plans WHERE task_id = ?')
  return Number(stmt.run(taskId).changes)
}
