// ペルソナのCRUD操作

import type { Persona } from '@cognac/shared'
import { transaction } from '../transaction.js'
import type { CognacDb } from '../types.js'

/**
 * ペルソナを一括作成する（トランザクション）
 */
export function createPersonas(
  db: CognacDb,
  taskId: number,
  personas: { persona_id: string; name: string; focus: string; tone: string; emoji: string }[],
): Persona[] {
  if (personas.length === 0) return []

  const stmt = db.prepare(`
    INSERT INTO personas (task_id, persona_id, name, focus, tone, emoji)
    VALUES (@task_id, @persona_id, @name, @focus, @tone, @emoji)
  `)

  const results: Persona[] = []

  const insertAll = transaction(db, () => {
    for (const persona of personas) {
      const result = stmt.run({ task_id: taskId, ...persona })
      results.push({
        id: Number(result.lastInsertRowid),
        task_id: taskId,
        ...persona,
        created_at: new Date().toISOString(),
      })
    }
  })

  insertAll()
  return results
}

/**
 * タスクIDでペルソナ一覧を取得する
 */
export function getPersonasByTaskId(db: CognacDb, taskId: number): Persona[] {
  const stmt = db.prepare(`SELECT * FROM personas WHERE task_id = ? ORDER BY id ASC`)
  return stmt.all(taskId) as unknown as Persona[]
}

/**
 * タスクIDでペルソナを全削除する（リトライ時のクリーンアップ用）
 */
export function deletePersonasByTaskId(db: CognacDb, taskId: number): number {
  const stmt = db.prepare('DELETE FROM personas WHERE task_id = ?')
  return Number(stmt.run(taskId).changes)
}
