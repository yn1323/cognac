import type { ConsoleRun, ConsoleRunStatus } from '@cognac/shared'
import type Database from 'better-sqlite3'

const ACTIVE_STATUSES = ['starting', 'running', 'stopping'] as const

export function createRun(
  db: Database.Database,
  input: {
    command_id: number
    status: ConsoleRunStatus
    pid?: number | null
    log_file_path: string
  },
): ConsoleRun {
  const stmt = db.prepare(`
    INSERT INTO console_runs (command_id, status, pid, log_file_path)
    VALUES (@command_id, @status, @pid, @log_file_path)
  `)
  const result = stmt.run({
    command_id: input.command_id,
    status: input.status,
    pid: input.pid ?? null,
    log_file_path: input.log_file_path,
  })
  return getRun(db, Number(result.lastInsertRowid)) as ConsoleRun
}

export function getRun(db: Database.Database, id: number): ConsoleRun | undefined {
  const stmt = db.prepare(`SELECT * FROM console_runs WHERE id = ?`)
  return stmt.get(id) as ConsoleRun | undefined
}

export function listRunsByCommandId(db: Database.Database, commandId: number): ConsoleRun[] {
  const stmt = db.prepare(`
    SELECT * FROM console_runs
    WHERE command_id = ?
    ORDER BY started_at DESC, id DESC
  `)
  return stmt.all(commandId) as ConsoleRun[]
}

export function getLatestRunByCommandId(
  db: Database.Database,
  commandId: number,
): ConsoleRun | undefined {
  const stmt = db.prepare(`
    SELECT * FROM console_runs
    WHERE command_id = ?
    ORDER BY started_at DESC, id DESC
    LIMIT 1
  `)
  return stmt.get(commandId) as ConsoleRun | undefined
}

export function getActiveRunByCommandId(
  db: Database.Database,
  commandId: number,
): ConsoleRun | undefined {
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(', ')
  const stmt = db.prepare(`
    SELECT * FROM console_runs
    WHERE command_id = ?
      AND status IN (${placeholders})
    ORDER BY started_at DESC, id DESC
    LIMIT 1
  `)
  return stmt.get(commandId, ...ACTIVE_STATUSES) as ConsoleRun | undefined
}

export function setRunPid(
  db: Database.Database,
  runId: number,
  pid: number | null,
): ConsoleRun | undefined {
  const stmt = db.prepare(`
    UPDATE console_runs
    SET pid = @pid
    WHERE id = @runId
  `)
  const result = stmt.run({ runId, pid })
  if (result.changes === 0) return undefined
  return getRun(db, runId)
}

export function setRunStatus(
  db: Database.Database,
  runId: number,
  status: ConsoleRunStatus,
): ConsoleRun | undefined {
  const stmt = db.prepare(`
    UPDATE console_runs
    SET status = @status
    WHERE id = @runId
  `)
  const result = stmt.run({ runId, status })
  if (result.changes === 0) return undefined
  return getRun(db, runId)
}

export function finishRun(
  db: Database.Database,
  runId: number,
  input: {
    status: Extract<ConsoleRunStatus, 'completed' | 'failed' | 'killed'>
    exitCode: number | null
    endedAt: string
    terminationReason?: string | null
  },
): ConsoleRun | undefined {
  const stmt = db.prepare(`
    UPDATE console_runs
    SET status = @status,
        exit_code = @exitCode,
        ended_at = @endedAt,
        termination_reason = @terminationReason
    WHERE id = @runId
  `)
  const result = stmt.run({
    runId,
    status: input.status,
    exitCode: input.exitCode,
    endedAt: input.endedAt,
    terminationReason: input.terminationReason ?? null,
  })
  if (result.changes === 0) return undefined
  return getRun(db, runId)
}

export function markActiveRunsKilledOnBoot(db: Database.Database, endedAt: string): number {
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(', ')
  const stmt = db.prepare(`
    UPDATE console_runs
    SET status = 'killed',
        ended_at = ?,
        termination_reason = 'startup_recovery'
    WHERE status IN (${placeholders})
  `)
  const result = stmt.run(endedAt, ...ACTIVE_STATUSES)
  return result.changes
}

export function listExpiredRuns(db: Database.Database, olderThanIso: string): ConsoleRun[] {
  const stmt = db.prepare(`
    SELECT * FROM console_runs
    WHERE ended_at IS NOT NULL
      AND ended_at < ?
    ORDER BY ended_at ASC, id ASC
  `)
  return stmt.all(olderThanIso) as ConsoleRun[]
}

export function deleteRuns(db: Database.Database, runIds: number[]): number {
  if (runIds.length === 0) return 0

  const placeholders = runIds.map(() => '?').join(', ')
  const stmt = db.prepare(`
    DELETE FROM console_runs
    WHERE id IN (${placeholders})
  `)
  const result = stmt.run(...runIds)
  return result.changes
}
