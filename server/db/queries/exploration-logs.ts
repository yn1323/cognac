import type Database from 'better-sqlite3'
import type { ExplorationLog } from '@cognac/shared'
import { toUtcIso8601 } from '../../utils/date-time.js'
import { insertLog, selectLogsByParentId, selectLogById, deleteLogsByParentId, type LogTableConfig } from './log-helpers.js'

const CONFIG: LogTableConfig = { tableName: 'exploration_logs', parentColumn: 'exploration_session_id' }

function normalizeLog(log: ExplorationLog): ExplorationLog {
  return {
    ...log,
    created_at: toUtcIso8601(log.created_at),
  }
}

export function createExplorationLog(
  db: Database.Database,
  data: {
    exploration_session_id: number
    phase: string
    session_id?: string
    input_summary?: string
    output_raw?: string
    output_summary?: string
    token_input?: number
    token_output?: number
    duration_ms?: number
    error_type?: string
    error_message?: string
  },
): ExplorationLog {
  return insertLog<ExplorationLog>(db, CONFIG, { parentId: data.exploration_session_id, ...data }, normalizeLog)
}

export function getExplorationLogsBySessionId(
  db: Database.Database,
  explorationSessionId: number,
): ExplorationLog[] {
  return selectLogsByParentId<ExplorationLog>(db, CONFIG, explorationSessionId, normalizeLog)
}

export function getExplorationLog(
  db: Database.Database,
  id: number,
): ExplorationLog | undefined {
  return selectLogById<ExplorationLog>(db, CONFIG, id, normalizeLog)
}

export function deleteExplorationLogsBySessionId(
  db: Database.Database,
  explorationSessionId: number,
): number {
  return deleteLogsByParentId(db, CONFIG, explorationSessionId)
}
