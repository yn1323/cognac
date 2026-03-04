import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import type Database from 'better-sqlite3'
import { tasksRouter } from './api/tasks.js'
import { streamRouter } from './api/stream.js'
import { systemRouter, type RunnerStatus } from './api/system.js'
import { EventBus } from './sse/event-bus.js'

export interface CreateAppOptions {
  db: Database.Database
  eventBus: EventBus
  runner: RunnerStatus
  // ビルド済みクライアントの静的ファイルディレクトリ（パッケージモード用）
  publicDir?: string
}

// Honoアプリを構築する
export function createApp({ db, eventBus, runner, publicDir }: CreateAppOptions) {
  const app = new Hono()

  // ミドルウェア
  app.use('/*', cors())

  // APIルーティング
  app.route('/api/tasks', tasksRouter(db))
  app.route('/api/tasks', streamRouter(eventBus))
  app.route('/api', systemRouter(runner))

  // アップロード画像の静的配信
  app.use('/uploads/*', serveStatic({ root: '.cognac/' }))

  // 静的ファイルサービング（パッケージモード用）
  if (publicDir && existsSync(publicDir)) {
    // アセットファイル（JS/CSS/画像等）を配信
    app.use('/*', serveStatic({ root: publicDir }))

    // SPAフォールバック: API以外のルートは index.html を返す
    app.get('*', (c) => {
      const indexPath = join(publicDir, 'index.html')
      if (existsSync(indexPath)) {
        const html = readFileSync(indexPath, 'utf-8')
        return c.html(html)
      }
      return c.text('Dashboard not found', 404)
    })
  }

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
