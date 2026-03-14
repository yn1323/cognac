import type { CognacDb } from '../db/types.js'
import * as consoleRunQueries from '../db/queries/console-runs.js'
import { deleteRunLog, ensureConsoleLogRoot } from './log-store.js'

const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000

export function runConsoleStartupRecovery(db: CognacDb, cwd: string): number {
  ensureConsoleLogRoot(cwd)
  return consoleRunQueries.markActiveRunsKilledOnBoot(db, new Date().toISOString())
}

export async function cleanupExpiredConsoleRuns(
  db: CognacDb,
  now: Date = new Date(),
  retentionMs: number = DEFAULT_RETENTION_MS,
): Promise<number> {
  const threshold = new Date(now.getTime() - retentionMs).toISOString()
  const expiredRuns = consoleRunQueries.listExpiredRuns(db, threshold)

  if (expiredRuns.length === 0) return 0

  await Promise.all(
    expiredRuns.map(async (run) => {
      await deleteRunLog(run.log_file_path)
    }),
  )

  return consoleRunQueries.deleteRuns(
    db,
    expiredRuns.map((run) => run.id),
  )
}

export function startConsoleCleanupScheduler(
  db: CognacDb,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): () => void {
  const timer = setInterval(() => {
    cleanupExpiredConsoleRuns(db).catch((error: unknown) => {
      console.error('console cleanup 失敗:', error)
    })
  }, intervalMs)

  return () => clearInterval(timer)
}
