// SSE接続フック（ジェネリック）
// エンティティIDとエンドポイントURLビルダーを受け取り、リアルタイムイベントを受信する

import { useCallback, useEffect, useRef, useState } from 'react'

export function useSSE<TEvent>(
  entityId: number | null,
  buildEndpoint: (id: number) => string,
  eventTypes: readonly string[],
) {
  const [events, setEvents] = useState<TEvent[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (entityId === null) return

    const es = new EventSource(buildEndpoint(entityId))
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    const MAX_EVENTS = 500

    const handler = (e: Event) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as TEvent
        setEvents((prev) => {
          const next = [...prev, data]
          return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
        })
      } catch {
        // パース失敗は無視
      }
    }

    for (const type of eventTypes) {
      es.addEventListener(type, handler)
    }

    return () => {
      for (const type of eventTypes) {
        es.removeEventListener(type, handler)
      }
      es.close()
      setConnected(false)
    }
  }, [entityId, buildEndpoint, eventTypes])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, connected, clearEvents }
}
