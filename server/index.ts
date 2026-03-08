import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import type Database from 'better-sqlite3'
import { tasksRouter, type TaskCanceller } from './api/tasks.js'
import { streamRouter } from './api/stream.js'
import { systemRouter, type RunnerStatus } from './api/system.js'
import { settingsRouter, type ConfigAccessor } from './api/settings.js'
import { EventBus } from './sse/event-bus.js'

export interface CreateAppOptions {
  db: Database.Database
  eventBus: EventBus
  runner: RunnerStatus & ConfigAccessor & TaskCanceller
  // ビルド済みクライアントの静的ファイルディレクトリ（パッケージモード用）
  publicDir?: string
  // 設定ファイル書き込み先（デフォルト: process.cwd()）
  cwd?: string
}

// Honoアプリを構築する
export function createApp({ db, eventBus, runner, publicDir, cwd = process.cwd() }: CreateAppOptions) {
  const app = new Hono()

  // ミドルウェア
  app.use('/*', cors())

  // APIルーティング
  app.route('/api/tasks', tasksRouter(db, runner))
  app.route('/api/tasks', streamRouter(eventBus))
  app.route('/api', systemRouter(runner, db))
  app.route('/api/settings', settingsRouter(runner, cwd))

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
export type { ConfigAccessor } from './api/settings.js'
