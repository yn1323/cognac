// 探索SSE接続フック
// ExplorationEventのリアルタイムストリーミングを受信する
// サーバーの explorations.ts は event: event.type で named events を送信する

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ExplorationEvent } from '@cognac/shared'

const EVENT_TYPES = [
  'phase_start',
  'phase_end',
  'persona_selected',
  'discussion_round_start',
  'discussion_statement',
  'discussion_round_end',
  'agent_output',
  'tool_invoked',
  'command_executed',
  'playwright_log',
  'artifact_created',
  'report_created',
  'taskify_started',
  'taskify_completed',
  'taskify_failed',
  'retry',
  'paused',
  'error',
  'completed',
] as const

export function useExplorationSSE(explorationId: number | null) {
  const [events, setEvents] = useState<ExplorationEvent[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (explorationId === null) return

    const es = new EventSource(`/api/explorations/${explorationId}/stream`)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    const MAX_EVENTS = 500

    const handler = (e: Event) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as ExplorationEvent
        setEvents((prev) => {
          const next = [...prev, data]
          return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
        })
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
  }, [explorationId])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, connected, clearEvents }
}
