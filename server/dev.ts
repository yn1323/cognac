// セルフ開発モード用のサーバー起動スクリプト
// pnpm dev で tsx watch 経由で実行される

import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './index.js'
import { EventBus } from './sse/event-bus.js'
import { openDb } from './db/connection.js'
import { TaskRunner } from './runner/task-runner.js'
import { ExplorationRunner } from './runner/exploration-runner.js'
import { ExecutionCoordinator } from './runner/execution-coordinator.js'
import { ConsoleManager } from './console/console-manager.js'
import { cleanupExpiredConsoleRuns, runConsoleStartupRecovery, startConsoleCleanupScheduler } from './console/cleanup.js'
import { defineConfig, type ExplorationEvent, type TaskEvent } from '@cognac/shared'

const cwd = resolve(process.cwd(), '..')
const config = defineConfig({
  ...(process.env.COGNAC_SERVER_PORT ? { port: Number(process.env.COGNAC_SERVER_PORT) } : {}),
})
const dbPath = resolve(cwd, '.cognac', 'db.sqlite')
const db = openDb(dbPath)
const taskEventBus = new EventBus<TaskEvent>()
const explorationEventBus = new EventBus<ExplorationEvent>()
const coordinator = new ExecutionCoordinator()
const taskRunner = new TaskRunner(db, taskEventBus, config, coordinator)
const explorationRunner = new ExplorationRunner(db, explorationEventBus, config, coordinator, cwd)
const consoleManager = new ConsoleManager(db, cwd)
runConsoleStartupRecovery(db, cwd)
void cleanupExpiredConsoleRuns(db)
const stopConsoleCleanup = startConsoleCleanupScheduler(db)

const systemStatusProvider = {
  getTaskRunnerStatus: () => taskRunner.getStatus(),
  getExplorationRunnerStatus: () => explorationRunner.getStatus(),
  getActiveExecution: () => coordinator.getCurrent(),
}

// publicDir なし（Vite dev server がフロントを配信する）
const app = createApp({
  db,
  taskEventBus,
  explorationEventBus,
  taskRunner,
  explorationRunner,
  systemStatusProvider,
  consoleManager,
  cwd,
})

serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  console.log(`🚀 Cognac Dev Server: http://localhost:${info.port}`)
})

taskRunner.start()
explorationRunner.start()

// グレースフルシャットダウン
const shutdown = async () => {
  console.log('\n⏹ シャットダウン中...')
  taskRunner.stop()
  explorationRunner.stop()
  stopConsoleCleanup()
  await consoleManager.shutdown()
  db.close()
  console.log('👋 おつかれ！')
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
