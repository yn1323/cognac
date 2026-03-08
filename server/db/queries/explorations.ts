import type Database from 'better-sqlite3'
import type {
  ExplorationListItem,
  ExplorationSession,
  ExplorationStatus,
} from '@cognac/shared'

type UpdateExplorationData = Partial<{
  title: string
  request: string
  status: ExplorationStatus
  final_report_markdown: string | null
  issue_count: number
  paused_reason: string | null
  updated_at: string
  started_at: string | null
  completed_at: string | null
}>

export function createExploration(
  db: Database.Database,
  data: { title: string; request: string },
): ExplorationSession {
  const stmt = db.prepare(`
    INSERT INTO exploration_sessions (title, request)
    VALUES (@title, @request)
  `)

  const result = stmt.run(data)
  return getExploration(db, Number(result.lastInsertRowid))!
}

export function getExploration(
  db: Database.Database,
  id: number,
): ExplorationSession | undefined {
  const stmt = db.prepare(`SELECT * FROM exploration_sessions WHERE id = ?`)
  return stmt.get(id) as ExplorationSession | undefined
}

export function listExplorations(db: Database.Database): ExplorationListItem[] {
  const stmt = db.prepare(`
    SELECT
      s.*,
      CASE WHEN s.final_report_markdown IS NOT NULL THEN 1 ELSE 0 END AS hasFinalReport,
      (
        SELECT status
        FROM exploration_taskify_jobs j
        WHERE j.exploration_session_id = s.id
        ORDER BY j.id DESC
        LIMIT 1
      ) AS latestTaskifyStatus
    FROM exploration_sessions s
    ORDER BY s.created_at DESC, s.id DESC
  `)

  return (stmt.all() as Array<ExplorationSession & {
    hasFinalReport: number
    latestTaskifyStatus: ExplorationListItem['latestTaskifyStatus']
  }>).map((row) => ({
    ...row,
    hasFinalReport: Boolean(row.hasFinalReport),
  }))
}

export function updateExploration(
  db: Database.Database,
  id: number,
  data: UpdateExplorationData,
): ExplorationSession | undefined {
  const entries = Object.entries({
    ...data,
    updated_at: data.updated_at ?? new Date().toISOString(),
  }).filter(([, value]) => value !== undefined)

  if (entries.length === 0) return getExploration(db, id)

  const setClause = entries.map(([key]) => `${key} = @${key}`).join(', ')
  const stmt = db.prepare(`
    UPDATE exploration_sessions
    SET ${setClause}
    WHERE id = @id
  `)

  const params: Record<string, unknown> = { id }
  for (const [key, value] of entries) {
    params[key] = value
  }

  const result = stmt.run(params)
  if (result.changes === 0) return undefined
  return getExploration(db, id)
}

export function getNextDraftExploration(
  db: Database.Database,
): ExplorationSession | undefined {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_sessions
    WHERE status = 'pending'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  `)
  return stmt.get() as ExplorationSession | undefined
}

export function markExplorationCompleted(
  db: Database.Database,
  id: number,
  finalReportMarkdown: string,
  issueCount: number,
): ExplorationSession | undefined {
  return updateExploration(db, id, {
    status: 'completed',
    final_report_markdown: finalReportMarkdown,
    issue_count: issueCount,
    paused_reason: null,
    completed_at: new Date().toISOString(),
  })
}

export function markExplorationPaused(
  db: Database.Database,
  id: number,
  reason: string,
): ExplorationSession | undefined {
  return updateExploration(db, id, {
    status: 'paused',
    paused_reason: reason,
  })
}

export function markExplorationFailed(
  db: Database.Database,
  id: number,
  reason: string,
): ExplorationSession | undefined {
  return updateExploration(db, id, {
    status: 'failed',
    paused_reason: reason,
  })
}
