// startコマンド
// サーバー起動 + タスクランナー開始
// 設定ファイルをjitiで読み込んで、DB初期化 → EventBus → TaskRunner → Honoアプリの順で起動

import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { createJiti } from 'jiti'
import { serve } from '@hono/node-server'
import { defineConfig, type SolitaryCodingConfig } from '@solitary-coding/shared'
import { createApp, EventBus, openDb, TaskRunner } from '@solitary-coding/server'

/**
 * 設定ファイルを読み込む
 * jitiでTypeScriptの設定ファイルを動的に読み込んで、defineConfigでデフォルト値をマージする
 */
async function loadConfig(cwd: string): Promise<SolitaryCodingConfig> {
  const configPath = resolve(cwd, 'solitary-coding.config.ts')

  if (!existsSync(configPath)) {
    console.warn('⚠ solitary-coding.config.ts が見つからないよ。デフォルト設定で起動するね')
    return defineConfig({})
  }

  const jiti = createJiti(cwd)
  const mod = (await jiti.import(configPath)) as { default?: Partial<SolitaryCodingConfig> }
  const userConfig = mod.default ?? {}
  return defineConfig(userConfig)
}

export async function runStart(): Promise<void> {
  const cwd = process.cwd()

  // 設定ファイル読み込み
  const config = await loadConfig(cwd)
  console.log(`🔧 ポート ${config.port} で起動するよ`)

  // DB初期化
  const dbPath = resolve(cwd, '.solitary-coding', 'db.sqlite')
  const db = openDb(dbPath)
  console.log('✔ DB接続OK')

  // EventBus作成
  const eventBus = new EventBus()

  // TaskRunner作成
  const runner = new TaskRunner(db, eventBus, config)

  // Honoアプリ作成
  const app = createApp({ db, eventBus, runner })

  // サーバー起動
  const server = serve(
    {
      fetch: app.fetch,
      port: config.port,
    },
    (info) => {
      console.log(`🚀 Solitary Coding 起動！ http://localhost:${info.port}`)
    },
  )

  // タスクランナー開始
  runner.start()

  // グレースフルシャットダウン
  const shutdown = () => {
    console.log('\n⏹ シャットダウン中...')
    runner.stop()
    db.close()
    server.close()
    console.log('👋 おつかれ！')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
