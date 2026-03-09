// タスク詳細ページ — ログタブ
// DB永続ログを常に表示し、実行中だけSSEイベントを補助表示する
// デザイン design.pen PC=ndNzU, SP=cZcuS に準拠

import { useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Task, TaskEvent } from '@cognac/shared'
import { useTaskLogs } from '@/hooks/use-tasks'
import { LogView } from '@/components/log-view'
import { LogEntry } from '@/components/log-entry'
import { getLivePhaseEvents } from '@/lib/live-phase-events'
import { ACTIVE_STATUSES } from '@/lib/status-config'

interface LogsTabProps {
  task: Task
  events: TaskEvent[]
  connected: boolean
}

function useTaskLogState(task: Task, sseEvents: TaskEvent[]) {
  const isActive = ACTIVE_STATUSES.has(task.status)
  const qc = useQueryClient()
  const { data: logs, isLoading } = useTaskLogs(task.id)

  // SSEで phase_end を受信したらDBログを再取得（新しいログ行が書き込まれたため）
  useEffect(() => {
    if (sseEvents.length === 0) return
    const last = sseEvents[sseEvents.length - 1]
    if (last?.type === 'phase_end') {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['tasks', task.id, 'logs'] })
      }, 500)
    }
  }, [sseEvents, task.id, qc])

  const liveEvents = useMemo(
    () => getLivePhaseEvents(sseEvents, isActive),
    [sseEvents, isActive],
  )

  return {
    logs: logs ?? [],
    isLoading,
    isActive,
    liveEvents,
  }
}

function TaskLogsBody({
  task,
  events,
  connected,
  compact = false,
}: LogsTabProps & { compact?: boolean }) {
  const { logs, isLoading, isActive, liveEvents } = useTaskLogState(task, events)
  const hasLogs = logs.length > 0
  const hasLiveEvents = liveEvents.length > 0

  return (
    <>
      {isActive && (
        <div className={`flex items-center gap-2 ${compact ? 'pb-2' : ''}`}>
          <div
            className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted-foreground'}`}
            title={connected ? 'リアルタイム接続中' : '未接続'}
          />
          {compact && (
            <span className="text-xs text-muted-foreground">
              {connected ? 'リアルタイム接続中' : '未接続'}
            </span>
          )}
        </div>
      )}

      {hasLogs ? (
        <div className="space-y-0">
          {logs.map((log) => (
            <LogEntry key={log.id} log={log} />
          ))}
        </div>
      ) : null}

      {hasLiveEvents ? (
        <div className={hasLogs ? 'mt-4 border-t border-border/50 pt-4' : ''}>
          <LogView events={liveEvents} />
        </div>
      ) : null}

      {!hasLogs && !hasLiveEvents ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {isLoading ? 'ログを読み込み中...' : isActive ? 'イベントを待ってるよ...' : '実行ログがまだないよ'}
        </div>
      ) : null}
    </>
  )
}

// --- PC版 ---

export function PCLogsTab({ task, events, connected }: LogsTabProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        <div className="flex h-full flex-col overflow-y-auto px-4 py-3">
          <TaskLogsBody task={task} events={events} connected={connected} />
        </div>
      </div>
    </div>
  )
}

// --- SP版 ---

export function SPLogsTab({ task, events, connected }: LogsTabProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card px-4 py-3">
        <TaskLogsBody task={task} events={events} connected={connected} compact />
      </div>
    </div>
  )
}
