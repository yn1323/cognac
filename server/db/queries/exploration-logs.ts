import type Database from 'better-sqlite3'
import type { ExplorationLog } from '@cognac/shared'

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
  const stmt = db.prepare(`
    INSERT INTO exploration_logs (
      exploration_session_id, phase, session_id, input_summary, output_raw, output_summary,
      token_input, token_output, duration_ms, error_type, error_message
    )
    VALUES (
      @exploration_session_id, @phase, @session_id, @input_summary, @output_raw, @output_summary,
      @token_input, @token_output, @duration_ms, @error_type, @error_message
    )
  `)

  const result = stmt.run({
    exploration_session_id: data.exploration_session_id,
    phase: data.phase,
    session_id: data.session_id ?? null,
    input_summary: data.input_summary ?? null,
    output_raw: data.output_raw ?? null,
    output_summary: data.output_summary ?? null,
    token_input: data.token_input ?? null,
    token_output: data.token_output ?? null,
    duration_ms: data.duration_ms ?? null,
    error_type: data.error_type ?? null,
    error_message: data.error_message ?? null,
  })

  return getExplorationLog(db, Number(result.lastInsertRowid))!
}

export function getExplorationLogsBySessionId(
  db: Database.Database,
  explorationSessionId: number,
): ExplorationLog[] {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_logs
    WHERE exploration_session_id = ?
    ORDER BY created_at ASC, id ASC
  `)
  return stmt.all(explorationSessionId) as ExplorationLog[]
}

export function getExplorationLog(
  db: Database.Database,
  id: number,
): ExplorationLog | undefined {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_logs
    WHERE id = ?
  `)
  return stmt.get(id) as ExplorationLog | undefined
}
