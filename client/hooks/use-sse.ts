// SSE接続フック
// タスクのリアルタイムイベントを受信する
// サーバーの stream.ts は event: event.type で named events を送信するから
// addEventListener でイベントタイプごとにリッスンする

import { useEffect, useRef, useState, useCallback } from 'react'
import type { TaskEvent } from '@cognac/shared'

// 全イベントタイプ（stream.ts が event フィールドに設定するやつ）
const EVENT_TYPES = [
  'phase_start',
  'phase_end',
  'persona_selected',
  'discussion_round_start',
  'discussion_statement',
  'discussion_round_end',
  'plan_created',
  'claude_output',
  'file_changed',
  'command_executed',
  'ci_start',
  'ci_result',
  'retry',
  'error',
  'paused',
  'git_operation',
  'completed',
] as const

export function useTaskSSE(taskId: number | null) {
  const [events, setEvents] = useState<TaskEvent[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (taskId === null) return

    const es = new EventSource(`/api/tasks/${taskId}/stream`)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    // 各イベントタイプをリッスン
    const handler = (e: Event) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as TaskEvent
        setEvents((prev) => [...prev, data])
      } catch {
        // パース失敗は無視
      }
    }

    for (const type of EVENT_TYPES) {
      es.addEventListener(type, handler)
    }

    return () => {
      for (const type of EVENT_TYPES) {
        es.removeEventListener(type, handler)
      }
      es.close()
      setConnected(false)
    }
  }, [taskId])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, connected, clearEvents }
}
