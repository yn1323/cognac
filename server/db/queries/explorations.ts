import type { ExplorationListItem, ExplorationSession, ExplorationStatus } from '@cognac/shared'
import type { CognacDb } from '../types.js'

type UpdateExplorationData = Partial<{
  title: string
  request: string
  status: ExplorationStatus
  discussion_depth: number
  final_report_markdown: string | null
  issue_count: number
  paused_reason: string | null
  updated_at: string
  started_at: string | null
  completed_at: string | null
}>

export function createExploration(
  db: CognacDb,
  data: { title: string; request: string; discussion_depth?: number },
): ExplorationSession {
  const stmt = db.prepare(`
    INSERT INTO exploration_sessions (title, request, discussion_depth)
    VALUES (@title, @request, @discussion_depth)
  `)

  const result = stmt.run({ ...data, discussion_depth: data.discussion_depth ?? 3 })
  return getExploration(db, Number(result.lastInsertRowid)) as ExplorationSession
}

export function getExploration(db: CognacDb, id: number): ExplorationSession | undefined {
  const stmt = db.prepare(`SELECT * FROM exploration_sessions WHERE id = ?`)
  return stmt.get(id) as unknown as ExplorationSession | undefined
}

export function listExplorations(db: CognacDb): ExplorationListItem[] {
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

  return (
    stmt.all() as unknown as Array<
      ExplorationSession & {
        hasFinalReport: number
        latestTaskifyStatus: ExplorationListItem['latestTaskifyStatus']
      }
    >
  ).map((row) => ({
    ...row,
    hasFinalReport: Boolean(row.hasFinalReport),
  }))
}

export function updateExploration(
  db: CognacDb,
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

export function getNextDraftExploration(db: CognacDb): ExplorationSession | undefined {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_sessions
    WHERE status = 'pending'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  `)
  return stmt.get() as unknown as ExplorationSession | undefined
}

export function deleteExploration(db: CognacDb, id: number): boolean {
  const stmt = db.prepare(`DELETE FROM exploration_sessions WHERE id = ?`)
  const result = stmt.run(id)
  return Number(result.changes) > 0
}

export function markExplorationCompleted(
  db: CognacDb,
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
  db: CognacDb,
  id: number,
  reason: string,
): ExplorationSession | undefined {
  return updateExploration(db, id, {
    status: 'paused',
    paused_reason: reason,
  })
}

export function markExplorationStopped(
  db: CognacDb,
  id: number,
  reason: string,
): ExplorationSession | undefined {
  return updateExploration(db, id, {
    status: 'stopped',
    paused_reason: reason,
    completed_at: new Date().toISOString(),
  })
}
