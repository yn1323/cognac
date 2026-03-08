// セルフ開発モード用のサーバー起動スクリプト
// pnpm dev で tsx watch 経由で実行される

import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './index.js'
import { EventBus } from './sse/event-bus.js'
import { openDb } from './db/connection.js'
import { TaskRunner } from './runner/task-runner.js'
import { defineConfig } from '@cognac/shared'

const cwd = process.cwd()
const config = defineConfig({})
const dbPath = resolve(cwd, '.cognac', 'db.sqlite')
const db = openDb(dbPath)
const eventBus = new EventBus()
const runner = new TaskRunner(db, eventBus, config)

// publicDir なし（Vite dev server がフロントを配信する）
const app = createApp({ db, eventBus, runner })

serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  console.log(`🚀 Cognac Dev Server: http://localhost:${info.port}`)
})

runner.start()

// グレースフルシャットダウン
const shutdown = () => {
  console.log('\n⏹ シャットダウン中...')
  runner.stop()
  db.close()
  console.log('👋 おつかれ！')
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
