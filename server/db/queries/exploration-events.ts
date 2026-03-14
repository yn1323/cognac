// 探索イベントの個別永続化クエリ

import type { StoredExplorationEvent } from '@cognac/shared'
import type { CognacDb } from '../types.js'

export function insertEvent(
  db: CognacDb,
  explorationSessionId: number,
  eventType: string,
  eventData: string,
): void {
  db.prepare(
    'INSERT INTO exploration_events (exploration_session_id, event_type, event_data) VALUES (?, ?, ?)',
  ).run(explorationSessionId, eventType, eventData)
}

export function getEventsByExplorationId(
  db: CognacDb,
  explorationSessionId: number,
): StoredExplorationEvent[] {
  return db
    .prepare(`
    SELECT * FROM exploration_events
    WHERE exploration_session_id = ?
    ORDER BY created_at ASC, id ASC
  `)
    .all(explorationSessionId) as unknown as StoredExplorationEvent[]
}

export function deleteEventsByExplorationId(db: CognacDb, explorationSessionId: number): number {
  return db
    .prepare('DELETE FROM exploration_events WHERE exploration_session_id = ?')
    .run(explorationSessionId).changes
}
