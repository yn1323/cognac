// タスクイベントの個別永続化クエリ

import type { StoredTaskEvent } from '@cognac/shared'
import type { CognacDb } from '../types.js'

export function insertEvent(
  db: CognacDb,
  taskId: number,
  eventType: string,
  eventData: string,
): void {
  db.prepare('INSERT INTO task_events (task_id, event_type, event_data) VALUES (?, ?, ?)').run(
    taskId,
    eventType,
    eventData,
  )
}

export function getEventsByTaskId(db: CognacDb, taskId: number): StoredTaskEvent[] {
  return db
    .prepare(`
    SELECT * FROM task_events
    WHERE task_id = ?
    ORDER BY created_at ASC, id ASC
  `)
    .all(taskId) as unknown as StoredTaskEvent[]
}

export function deleteEventsByTaskId(db: CognacDb, taskId: number): number {
  return Number(db.prepare('DELETE FROM task_events WHERE task_id = ?').run(taskId).changes)
}
