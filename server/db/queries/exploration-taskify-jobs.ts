import type Database from 'better-sqlite3'
import type { ExplorationTaskifyJob } from '@cognac/shared'

export function createExplorationTaskifyJob(
  db: Database.Database,
  explorationSessionId: number,
): ExplorationTaskifyJob {
  const stmt = db.prepare(`
    INSERT INTO exploration_taskify_jobs (exploration_session_id)
    VALUES (?)
  `)
  const result = stmt.run(explorationSessionId)
  return getExplorationTaskifyJob(db, Number(result.lastInsertRowid))!
}

export function getExplorationTaskifyJob(
  db: Database.Database,
  id: number,
): ExplorationTaskifyJob | undefined {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_taskify_jobs
    WHERE id = ?
  `)
  return stmt.get(id) as ExplorationTaskifyJob | undefined
}

export function getLatestExplorationTaskifyJobBySessionId(
  db: Database.Database,
  explorationSessionId: number,
): ExplorationTaskifyJob | undefined {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_taskify_jobs
    WHERE exploration_session_id = ?
    ORDER BY id DESC
    LIMIT 1
  `)
  return stmt.get(explorationSessionId) as ExplorationTaskifyJob | undefined
}

export function getNextPendingExplorationTaskifyJob(
  db: Database.Database,
): ExplorationTaskifyJob | undefined {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_taskify_jobs
    WHERE status = 'pending'
    ORDER BY requested_at ASC, id ASC
    LIMIT 1
  `)
  return stmt.get() as ExplorationTaskifyJob | undefined
}

export function hasActiveExplorationTaskifyJob(
  db: Database.Database,
  explorationSessionId: number,
): boolean {
  const stmt = db.prepare(`
    SELECT COUNT(*) AS count
    FROM exploration_taskify_jobs
    WHERE exploration_session_id = ?
      AND status IN ('pending', 'running')
  `)
  const result = stmt.get(explorationSessionId) as { count: number }
  return result.count > 0
}

export function markExplorationTaskifyJobRunning(
  db: Database.Database,
  id: number,
): ExplorationTaskifyJob | undefined {
  const stmt = db.prepare(`
    UPDATE exploration_taskify_jobs
    SET status = 'running', started_at = @started_at
    WHERE id = @id
  `)
  const result = stmt.run({
    id,
    started_at: new Date().toISOString(),
  })
  if (result.changes === 0) return undefined
  return getExplorationTaskifyJob(db, id)
}

export function markExplorationTaskifyJobCompleted(
  db: Database.Database,
  id: number,
  resultJson: string,
): ExplorationTaskifyJob | undefined {
  const stmt = db.prepare(`
    UPDATE exploration_taskify_jobs
    SET status = 'completed', result_json = @result_json, error_message = NULL, completed_at = @completed_at
    WHERE id = @id
  `)
  const result = stmt.run({
    id,
    result_json: resultJson,
    completed_at: new Date().toISOString(),
  })
  if (result.changes === 0) return undefined
  return getExplorationTaskifyJob(db, id)
}

export function markExplorationTaskifyJobFailed(
  db: Database.Database,
  id: number,
  errorMessage: string,
): ExplorationTaskifyJob | undefined {
  const stmt = db.prepare(`
    UPDATE exploration_taskify_jobs
    SET status = 'failed', error_message = @error_message, completed_at = @completed_at
    WHERE id = @id
  `)
  const result = stmt.run({
    id,
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  })
  if (result.changes === 0) return undefined
  return getExplorationTaskifyJob(db, id)
}
