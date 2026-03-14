// セルフ開発モード用のサーバー起動スクリプト
// pnpm dev で tsx watch 経由で実行される

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  type CognacConfig,
  defineConfig,
  type ExplorationEvent,
  type TaskEvent,
} from '@cognac/shared'
import { serve } from '@hono/node-server'
import { createJiti } from 'jiti'
import {
  cleanupExpiredConsoleRuns,
  runConsoleStartupRecovery,
  startConsoleCleanupScheduler,
} from './console/cleanup.js'
import { ConsoleManager } from './console/console-manager.js'
import { openDb } from './db/connection.js'
import { createApp } from './index.js'
import { ExecutionCoordinator } from './runner/execution-coordinator.js'
import { ExplorationRunner } from './runner/exploration-runner.js'
import { TaskRunner } from './runner/task-runner.js'
import { EventBus } from './sse/event-bus.js'

const cwd = resolve(process.cwd(), '..')

// cognac.config.ts を読み込む
// 'cognac' パッケージ(CLI)を直接importするとCommanderが走るため、
// jiti の alias で '@cognac/shared' にリダイレクトする
async function loadConfig(): Promise<CognacConfig> {
  const configPath = resolve(cwd, 'cognac.config.ts')
  const envOverrides: Partial<CognacConfig> = {}
  if (process.env.COGNAC_SERVER_PORT) {
    envOverrides.port = Number(process.env.COGNAC_SERVER_PORT)
  }

  if (!existsSync(configPath)) {
    console.warn('⚠ cognac.config.ts が見つからないよ。デフォルト設定で起動するね')
    return defineConfig(envOverrides)
  }

  try {
    const jiti = createJiti(cwd, { alias: { cognac: '@cognac/shared' } })
    const mod = (await jiti.import(configPath)) as { default?: Partial<CognacConfig> }
    const userConfig = mod.default ?? {}
    return defineConfig({ ...userConfig, ...envOverrides })
  } catch (err) {
    console.warn('⚠ cognac.config.ts の読み込みに失敗。デフォルト設定で起動するね:', err)
    return defineConfig(envOverrides)
  }
}

const config = await loadConfig()
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
