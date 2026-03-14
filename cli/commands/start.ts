// startコマンド
// サーバー起動 + タスクランナー開始
// 設定ファイルをjitiで読み込んで、DB初期化 → EventBus → TaskRunner → Honoアプリの順で起動

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ConsoleManager,
  cleanupExpiredConsoleRuns,
  createApp,
  EventBus,
  ExecutionCoordinator,
  ExplorationRunner,
  openDb,
  runConsoleStartupRecovery,
  startConsoleCleanupScheduler,
  TaskRunner,
} from '@cognac/server'
import {
  type CognacConfig,
  defineConfig,
  type ExplorationEvent,
  type TaskEvent,
} from '@cognac/shared'
import { serve } from '@hono/node-server'
import { createJiti } from 'jiti'

/**
 * 設定ファイルを読み込む
 * jitiでTypeScriptの設定ファイルを動的に読み込んで、defineConfigでデフォルト値をマージする
 */
async function loadConfig(cwd: string): Promise<CognacConfig> {
  const configPath = resolve(cwd, 'cognac.config.ts')

  if (!existsSync(configPath)) {
    console.warn('⚠ cognac.config.ts が見つからないよ。デフォルト設定で起動するね')
    return defineConfig({})
  }

  const cliDir = dirname(fileURLToPath(import.meta.url))
  const jiti = createJiti(cwd, {
    alias: { '@yn1323/cognac': resolve(cliDir, 'config.js') },
  })
  const mod = (await jiti.import(configPath)) as { default?: Partial<CognacConfig> }
  const userConfig = mod.default ?? {}
  return defineConfig(userConfig)
}

export async function runStart(): Promise<void> {
  const cwd = process.cwd()

  // 設定ファイル読み込み
  const config = await loadConfig(cwd)
  console.log(`🔧 ポート ${config.port} で起動するよ`)

  // DB初期化
  const dbPath = resolve(cwd, '.cognac', 'db.sqlite')
  const db = openDb(dbPath)
  console.log('✔ DB接続OK')

  // EventBus作成
  const taskEventBus = new EventBus<TaskEvent>()
  const explorationEventBus = new EventBus<ExplorationEvent>()
  const coordinator = new ExecutionCoordinator()

  // TaskRunner作成
  const runner = new TaskRunner(db, taskEventBus, config, coordinator)
  const explorationRunner = new ExplorationRunner(db, explorationEventBus, config, coordinator, cwd)
  const consoleManager = new ConsoleManager(db, cwd)
  runConsoleStartupRecovery(db, cwd)
  await cleanupExpiredConsoleRuns(db)
  const stopConsoleCleanup = startConsoleCleanupScheduler(db)

  const systemStatusProvider = {
    getTaskRunnerStatus: () => runner.getStatus(),
    getExplorationRunnerStatus: () => explorationRunner.getStatus(),
    getActiveExecution: () => coordinator.getCurrent(),
  }

  // ビルド済みクライアントのパスを解決（CLIバイナリと同階層の public/）
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const publicDir = resolve(__dirname, 'public')

  // Honoアプリ作成
  const app = createApp({
    db,
    taskEventBus,
    explorationEventBus,
    taskRunner: runner,
    explorationRunner,
    systemStatusProvider,
    consoleManager,
    publicDir,
    cwd,
  })

  // サーバー起動
  const server = serve(
    {
      fetch: app.fetch,
      hostname: config.host,
      port: config.port,
    },
    (info) => {
      console.log(`🚀 Cognac 起動！ http://localhost:${info.port}`)
    },
  )

  // タスクランナー開始
  runner.start()
  explorationRunner.start()

  // グレースフルシャットダウン
  const shutdown = async () => {
    console.log('\n⏹ シャットダウン中...')
    runner.stop()
    explorationRunner.stop()
    stopConsoleCleanup()
    await consoleManager.shutdown()
    db.close()
    server.close()
    console.log('👋 おつかれ！')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
