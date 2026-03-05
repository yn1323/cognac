// タスク詳細ページ — ログタブ
// アクティブ: SSEイベントをリアルタイム表示（親コンポーネントからprops経由）
// 非アクティブ: SSEイベントが残っていればそれを表示、なければDB履歴ログを表示
// デザイン design.pen PC=ndNzU, SP=cZcuS に準拠

import { useMemo } from 'react'
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

// SSEイベントまたはDB履歴からイベントを統合表示するフック
function useAllEvents(task: Task, sseEvents: TaskEvent[]) {
  const isActive = ACTIVE_STATUSES.has(task.status)
  const { data: logs, isLoading } = useTaskLogs(task.id)

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

  // SSEで受信済みのイベントがあればそちらを優先、なければDB履歴
  const allEvents = sseEvents.length > 0 ? sseEvents : historyEvents

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
