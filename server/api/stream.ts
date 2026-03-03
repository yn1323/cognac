import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { EventBus } from '../sse/event-bus.js'

export function streamRouter(eventBus: EventBus) {
  const app = new Hono()

  // SSEストリーム
  app.get('/:id/stream', (c) => {
    const taskId = Number(c.req.param('id'))

    return streamSSE(c, async (stream) => {
      // クライアント切断を検知するためのPromise
      const { promise, resolve } = Promise.withResolvers<void>()

      const unsubscribe = eventBus.subscribe(taskId, (event) => {
        stream.writeSSE({
          data: JSON.stringify(event),
          event: event.type,
        })

        // 完了・インフラエラー時はストリーム終了
        if (event.type === 'completed' || (event.type === 'error' && event.errorType === 'infra')) {
          resolve()
        }
      })

      // クライアント切断時のクリーンアップ
      stream.onAbort(() => {
        unsubscribe()
        resolve()
      })

      // ストリーム終了まで待機
      await promise
      unsubscribe()
    })
  })

  return app
}
