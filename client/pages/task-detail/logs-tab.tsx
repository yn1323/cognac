// タスク詳細ページ — ログタブ
// アクティブ: SSEイベントをリアルタイム表示（親コンポーネントからprops経由）
// 非アクティブ: SSEイベントが残っていればそれを表示、なければDB履歴ログを表示
// デザイン design.pen PC=ndNzU, SP=cZcuS に準拠

import { useMemo, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Task, TaskEvent, ExecutionLog } from '@cognac/shared'
import { useTaskLogs } from '@/hooks/use-tasks'
import { LogView } from '@/components/log-view'
import { ACTIVE_STATUSES } from '@/lib/status-config'

interface LogsTabProps {
  task: Task
  events: TaskEvent[]
  connected: boolean
}

// DB履歴ログの1行表示
function LogEntry({ log }: { log: ExecutionLog }) {
  const hasError = log.error_type != null
  return (
    <div className="flex gap-2 border-b border-border/50 py-1">
      <span className="w-16 shrink-0 font-mono text-xs font-semibold text-blue-600">
        [{log.phase}]
      </span>
      <div className="flex-1 font-mono text-xs">
        {hasError ? (
          <span className="text-red-600">
            {log.error_type}: {log.error_message}
          </span>
        ) : (
          <span className="text-foreground">
            {log.output_summary ?? '完了'}
            {log.duration_ms != null && (
              <span className="ml-2 text-muted-foreground">({log.duration_ms}ms)</span>
            )}
            {log.token_input != null && (
              <span className="ml-2 text-muted-foreground">
                tokens: {log.token_input}→{log.token_output}
              </span>
            )}
          </span>
        )}
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {log.created_at}
      </span>
    </div>
  )
}

// SSEイベントとDB履歴を加算マージするフック
// DB履歴 = 完了済みフェーズ、SSE = 現在進行中フェーズ
// phase:timestamp キーでデデュプして重複を防ぐ
function useAllEvents(task: Task, sseEvents: TaskEvent[]) {
  const isActive = ACTIVE_STATUSES.has(task.status)
  const qc = useQueryClient()
  const { data: logs, isLoading } = useTaskLogs(task.id)

  // SSEで phase_end を受信したらDBログを再取得（新しいログ行が書き込まれたため）
  const lastPhaseEndCount = useRef(0)
  useEffect(() => {
    const count = sseEvents.filter(e => e.type === 'phase_end').length
    if (count > lastPhaseEndCount.current) {
      lastPhaseEndCount.current = count
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['tasks', task.id, 'logs'] })
      }, 500)
    }
  }, [sseEvents, task.id, qc])

  useEffect(() => {
    lastPhaseEndCount.current = 0
  }, [task.id])

  // DB履歴からイベントをパース
  const historyEvents = useMemo(() => {
    if (!logs) return []
    const evts: TaskEvent[] = []
    for (const log of logs) {
      if (log.output_raw) {
        try {
          evts.push(...(JSON.parse(log.output_raw) as TaskEvent[]))
        } catch { /* skip */ }
      }
    }
    return evts
  }, [logs])

  // マージ: DB履歴 + 重複除去したSSEイベント
  const allEvents = useMemo(() => {
    if (sseEvents.length === 0) return historyEvents
    if (historyEvents.length === 0) return sseEvents

    // DB履歴にある phase_start のキーセットを構築
    const dbPhaseKeys = new Set<string>()
    for (const evt of historyEvents) {
      if (evt.type === 'phase_start') {
        dbPhaseKeys.add(`${evt.phase}:${evt.timestamp}`)
      }
    }

    // SSEイベントのうち、DBに既にあるフェーズをスキップ
    let currentSsePhaseInDb = false
    let sseStartIndex = sseEvents.length

    for (let i = 0; i < sseEvents.length; i++) {
      const evt = sseEvents[i]
      if (evt.type === 'phase_start') {
        currentSsePhaseInDb = dbPhaseKeys.has(`${evt.phase}:${evt.timestamp}`)
      }
      if (!currentSsePhaseInDb) {
        sseStartIndex = i
        break
      }
    }

    return [...historyEvents, ...sseEvents.slice(sseStartIndex)]
  }, [historyEvents, sseEvents])

  return { allEvents, logs, isLoading, isActive }
}

// --- PC版 ---

export function PCLogsTab({ task, events, connected }: LogsTabProps) {
  const { allEvents, logs, isActive } = useAllEvents(task, events)

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ツールバー */}
      {isActive && (
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted-foreground'}`}
            title={connected ? 'リアルタイム接続中' : '未接続'}
          />
        </div>
      )}

      {/* ログビュー */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        <div className="flex h-full flex-col overflow-y-auto px-4 py-3">
          {allEvents.length > 0 ? (
            <LogView events={allEvents} />
          ) : !isActive && logs && logs.length > 0 ? (
            <div className="space-y-0">
              {logs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isActive ? 'イベントを待ってるよ...' : '実行ログがまだないよ'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- SP版 ---

export function SPLogsTab({ task, events, connected }: LogsTabProps) {
  const { allEvents, logs, isActive } = useAllEvents(task, events)

  return (
    <div className="flex flex-1 flex-col">
      {/* 接続ステータス（リアルタイム時のみ） */}
      {isActive && (
        <div className="flex items-center gap-2 pb-2">
          <div
            className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted-foreground'}`}
          />
          <span className="text-xs text-muted-foreground">
            {connected ? 'リアルタイム接続中' : '未接続'}
          </span>
        </div>
      )}

      {/* ログビュー */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card px-4 py-3">
        {allEvents.length > 0 ? (
          <LogView events={allEvents} />
        ) : !isActive && logs && logs.length > 0 ? (
          <div className="space-y-0">
            {logs.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {isActive ? 'イベントを待ってるよ...' : '実行ログがまだないよ'}
          </div>
        )}
      </div>
    </div>
  )
}
