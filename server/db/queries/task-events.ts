// タスクイベントの個別永続化クエリ

import type Database from 'better-sqlite3'
import type { StoredTaskEvent } from '@cognac/shared'

export function insertEvent(
  db: Database.Database,
  taskId: number,
  eventType: string,
  eventData: string,
): void {
  db.prepare('INSERT INTO task_events (task_id, event_type, event_data) VALUES (?, ?, ?)')
    .run(taskId, eventType, eventData)
}

export function getEventsByTaskId(
  db: Database.Database,
  taskId: number,
): StoredTaskEvent[] {
  return db.prepare(`
    SELECT * FROM task_events
    WHERE task_id = ?
    ORDER BY created_at ASC, id ASC
  `).all(taskId) as StoredTaskEvent[]
}

export function deleteEventsByTaskId(
  db: Database.Database,
  taskId: number,
): number {
  return db.prepare('DELETE FROM task_events WHERE task_id = ?')
    .run(taskId).changes
}
