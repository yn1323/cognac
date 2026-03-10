import type { TaskEvent } from '@cognac/shared'
import type Database from 'better-sqlite3'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import * as taskEventQueries from '../db/queries/task-events.js'
import type { EventBus } from '../sse/event-bus.js'

export function streamRouter(eventBus: EventBus<TaskEvent>, db: Database.Database) {
  const app = new Hono()

  // SSEストリーム
  app.get('/:id/stream', (c) => {
    const taskId = Number(c.req.param('id'))

    return streamSSE(c, async (stream) => {
      const { promise, resolve } = Promise.withResolvers<void>()

      // リプレイ中のライブイベントをバッファリング
      const liveBuffer: TaskEvent[] = []
      let buffering = true

      const unsubscribe = eventBus.subscribe(taskId, (event) => {
        if (buffering) {
          liveBuffer.push(event)
        } else {
          stream.writeSSE({ data: JSON.stringify(event), event: event.type })
        }

        if (event.type === 'completed' || (event.type === 'error' && event.errorType === 'infra')) {
          resolve()
        }
      })

      // DB既存イベントをリプレイ送信（JSON parse不要、event_dataをそのまま使用）
      const existingEvents = taskEventQueries.getEventsByTaskId(db, taskId)
      for (const row of existingEvents) {
        await stream.writeSSE({ data: row.event_data, event: row.event_type })
      }

      // バッファリング終了 → バッファ内のライブイベントをフラッシュ
      buffering = false
      for (const event of liveBuffer) {
        await stream.writeSSE({ data: JSON.stringify(event), event: event.type })
      }

      stream.onAbort(() => {
        unsubscribe()
        resolve()
      })

      await promise
      unsubscribe()
    })
  })

  return app
}
