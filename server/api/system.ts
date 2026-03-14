import type Database from 'better-sqlite3'
import { Hono } from 'hono'
import { initializeSchema } from '../db/schema.js'
import type { ActiveExecution } from '../runner/execution-coordinator.js'

export type RunnerState = 'running' | 'paused' | 'idle'

// ランナーの状態を取得するインターフェース
export interface RunnerStatus {
  getStatus(): RunnerState
}

export interface SystemStatusProvider {
  getTaskRunnerStatus(): RunnerState
  getExplorationRunnerStatus(): RunnerState
  getActiveExecution(): ActiveExecution
}

export function systemRouter(statusProvider: SystemStatusProvider, db: Database.Database) {
  const app = new Hono()

  // システムステータス
  app.get('/status', (c) => {
    return c.json({
      taskRunnerStatus: statusProvider.getTaskRunnerStatus(),
      explorationRunnerStatus: statusProvider.getExplorationRunnerStatus(),
      activeExecution: statusProvider.getActiveExecution(),
      timestamp: new Date().toISOString(),
    })
  })

  // データベース再初期化（全テーブルを作り直して最新スキーマに戻す）
  app.delete('/database', (c) => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[]

    db.pragma('foreign_keys = OFF')
    db.transaction(() => {
      for (const { name } of tables) {
        if (!/^[A-Za-z0-9_]+$/.test(name)) continue
        db.prepare(`DROP TABLE IF EXISTS "${name}"`).run()
      }
    })()
    initializeSchema(db)
    db.pragma('foreign_keys = ON')

    return c.json({ ok: true })
  })

  return app
}
