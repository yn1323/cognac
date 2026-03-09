import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import type { ExplorationEvent, TaskEvent } from '@cognac/shared'
import type Database from 'better-sqlite3'
import { tasksRouter, type TaskCanceller } from './api/tasks.js'
import { streamRouter } from './api/stream.js'
import { explorationsRouter, type ExplorationCanceller } from './api/explorations.js'
import { systemRouter, type RunnerStatus, type SystemStatusProvider } from './api/system.js'
import { settingsRouter, type ConfigAccessor, type ConfigSource } from './api/settings.js'
import { gitRouter } from './api/git.js'
import { consoleRouter } from './api/console.js'
import { EventBus } from './sse/event-bus.js'
import { ConsoleManager } from './console/console-manager.js'
import { runConsoleStartupRecovery, startConsoleCleanupScheduler, cleanupExpiredConsoleRuns } from './console/cleanup.js'

export interface CreateAppOptions {
  db: Database.Database
  taskEventBus: EventBus<TaskEvent>
  explorationEventBus: EventBus<ExplorationEvent>
  taskRunner: RunnerStatus & ConfigSource & ConfigAccessor & TaskCanceller
  explorationRunner: RunnerStatus & ConfigAccessor & ExplorationCanceller
  systemStatusProvider: SystemStatusProvider
  consoleManager: ConsoleManager
  // ビルド済みクライアントの静的ファイルディレクトリ（パッケージモード用）
  publicDir?: string
  // 設定ファイル書き込み先（デフォルト: process.cwd()）
  cwd?: string
}

// Honoアプリを構築する
export function createApp({
  db,
  taskEventBus,
  explorationEventBus,
  taskRunner,
  explorationRunner,
  systemStatusProvider,
  consoleManager,
  publicDir,
  cwd = process.cwd(),
}: CreateAppOptions) {
  const app = new Hono()

  // ミドルウェア
  app.use('/*', cors())

  // APIルーティング
  app.route('/api/tasks', tasksRouter(db, taskRunner))
  app.route('/api/tasks', streamRouter(taskEventBus, db))
  app.route('/api/explorations', explorationsRouter(db, explorationEventBus, explorationRunner))
  app.route('/api', systemRouter(systemStatusProvider, db))
  app.route('/api/settings', settingsRouter(taskRunner, [taskRunner, explorationRunner], cwd))
  app.route('/api/git', gitRouter(cwd, () => taskRunner.getConfig()))
  app.route('/api/console', consoleRouter(consoleManager))

  // 添付画像と探索artifactの静的配信
  app.use('/uploads/*', serveStatic({ root: '.cognac/' }))
  app.use('/artifacts/*', serveStatic({ root: '.cognac/' }))

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
export { ExplorationRunner } from './runner/exploration-runner.js'
export { ExecutionCoordinator } from './runner/execution-coordinator.js'
export { ConsoleManager } from './console/console-manager.js'
export { runConsoleStartupRecovery, startConsoleCleanupScheduler, cleanupExpiredConsoleRuns } from './console/cleanup.js'
export type { RunnerStatus } from './api/system.js'
export type { ConfigAccessor, ConfigSource } from './api/settings.js'
