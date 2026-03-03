import { Hono } from 'hono'

// ランナーの状態を取得するインターフェース
export interface RunnerStatus {
  getStatus(): 'running' | 'paused' | 'idle'
}

export function systemRouter(runner: RunnerStatus) {
  const app = new Hono()

  // システムステータス
  app.get('/status', (c) => {
    return c.json({
      status: runner.getStatus(),
      timestamp: new Date().toISOString(),
    })
  })

  return app
}
