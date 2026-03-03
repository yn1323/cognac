import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type Database from 'better-sqlite3'
import { tasksRouter } from './api/tasks.js'
import { streamRouter } from './api/stream.js'
import { systemRouter, type RunnerStatus } from './api/system.js'
import { EventBus } from './sse/event-bus.js'

export interface CreateAppOptions {
  db: Database.Database
  eventBus: EventBus
  runner: RunnerStatus
}

// Honoアプリを構築する
export function createApp({ db, eventBus, runner }: CreateAppOptions) {
  const app = new Hono()

  // ミドルウェア
  app.use('/*', cors())

  // APIルーティング
  app.route('/api/tasks', tasksRouter(db))
  app.route('/api/tasks', streamRouter(eventBus))
  app.route('/api', systemRouter(runner))

  // エラーハンドリング
  app.onError((err, c) => {
    console.error('サーバーエラー:', err)
    return c.json({ error: err.message }, 500)
  })

  return app
}

// 型とモジュールの再エクスポート
export { EventBus } from './sse/event-bus.js'
export { openDb } from './db/connection.js'
export { TaskRunner } from './runner/task-runner.js'
export type { RunnerStatus } from './api/system.js'
