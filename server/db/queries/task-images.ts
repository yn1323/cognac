// タスク画像のCRUD操作

import type Database from 'better-sqlite3'
import type { TaskImage } from '@cognac/shared'

/**
 * タスク画像のメタデータを保存する
 */
export function createTaskImage(
  db: Database.Database,
  data: {
    task_id: number
    file_path: string
    original_name: string
    mime_type: string
  },
): TaskImage {
  const stmt = db.prepare(`
    INSERT INTO task_images (task_id, file_path, original_name, mime_type)
    VALUES (@task_id, @file_path, @original_name, @mime_type)
  `)

  const result = stmt.run(data)
  return getTaskImage(db, Number(result.lastInsertRowid))!
}

/**
 * タスク画像を1件取得する
 */
export function getTaskImage(
  db: Database.Database,
  id: number,
): TaskImage | undefined {
  const stmt = db.prepare(`SELECT * FROM task_images WHERE id = ?`)
  return stmt.get(id) as TaskImage | undefined
}

/**
 * タスクに紐づく画像一覧を取得する
 */
export function listTaskImages(
  db: Database.Database,
  taskId: number,
): TaskImage[] {
  const stmt = db.prepare(
    `SELECT * FROM task_images WHERE task_id = ? ORDER BY created_at ASC`,
  )
  return stmt.all(taskId) as TaskImage[]
}

/**
 * タスク画像を削除する
 */
export function deleteTaskImage(
  db: Database.Database,
  id: number,
): boolean {
  const stmt = db.prepare('DELETE FROM task_images WHERE id = ?')
  return stmt.run(id).changes > 0
}
