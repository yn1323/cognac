// コンソールSSEフック
// run の stdout/stderr をリアルタイムで蓄積し、ログ文字列として返す
// 高頻度 run_output 対策として requestAnimationFrame でバッチ反映

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ConsoleStreamEvent } from '@cognac/shared'

const EVENT_TYPES: ConsoleStreamEvent['type'][] = [
  'run_started',
  'run_status_changed',
  'run_output',
  'run_exit',
  'run_log_truncated',
]

export function useConsoleSSE(runId: number | null) {
  const [log, setLog] = useState('')
  const [connected, setConnected] = useState(false)
  const [runExited, setRunExited] = useState(false)
  const bufferRef = useRef('')
  const rafRef = useRef<number | null>(null)

  const flushBuffer = useCallback(() => {
    rafRef.current = null
    setLog(bufferRef.current)
  }, [])

  const scheduleFlush = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushBuffer)
    }
  }, [flushBuffer])

  useEffect(() => {
    if (runId === null) return

    // 新しい接続時にリセット
    bufferRef.current = ''
    setLog('')
    setRunExited(false)

    const es = new EventSource(`/api/console/runs/${runId}/stream`)

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    const handler = (e: Event) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as ConsoleStreamEvent

        if (data.type === 'run_output') {
          bufferRef.current += data.chunk
          scheduleFlush()
        } else if (data.type === 'run_exit') {
          setRunExited(true)
        }
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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [runId, scheduleFlush])

  const clearLog = useCallback(() => {
    bufferRef.current = ''
    setLog('')
    setRunExited(false)
  }, [])

  return { log, connected, runExited, clearLog }
}
