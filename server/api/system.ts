import { Hono } from 'hono'
import type Database from 'better-sqlite3'

// ランナーの状態を取得するインターフェース
export interface RunnerStatus {
  getStatus(): 'running' | 'paused' | 'idle'
}

export function systemRouter(runner: RunnerStatus, db: Database.Database) {
  const app = new Hono()

  // システムステータス
  app.get('/status', (c) => {
    return c.json({
      status: runner.getStatus(),
      timestamp: new Date().toISOString(),
    })
  })

  // データベース全テーブル削除（データのみ。スキーマは残す）
  app.delete('/database', (c) => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as { name: string }[]

    db.pragma('foreign_keys = OFF')
    db.transaction(() => {
      for (const { name } of tables) {
        if (!/^[A-Za-z0-9_]+$/.test(name)) continue
        db.prepare(`DELETE FROM "${name}"`).run()
      }
    })()
    db.pragma('foreign_keys = ON')

    return c.json({ ok: true })
  })

  return app
}
