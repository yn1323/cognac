// タスク詳細ページ — ログタブ
// SSEイベント（リプレイ含む）をLogViewで一本化表示
// 非アクティブタスクはAPI経由で永続化イベントを取得
// デザイン design.pen PC=ndNzU, SP=cZcuS に準拠

import type { Task, TaskEvent } from '@cognac/shared'
import { LogView } from '@/components/log-view'
import { useTaskEvents } from '@/hooks/use-tasks'
import { ACTIVE_STATUSES } from '@/lib/status-config'

interface LogsTabProps {
  task: Task
  events: TaskEvent[]
  connected: boolean
}

function TaskLogsBody({
  task,
  events: sseEvents,
  connected,
  compact = false,
}: LogsTabProps & { compact?: boolean }) {
  const isActive = ACTIVE_STATUSES.has(task.status)

  // 非アクティブ時はSSE接続がないのでAPIからイベント取得
  const { data: dbEvents, isLoading } = useTaskEvents(task.id, !isActive)

  // アクティブ時はSSE（リプレイ+新規）、非アクティブ時はAPIから
  const events = isActive ? sseEvents : (dbEvents ?? [])
  const hasEvents = events.length > 0

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

      {hasEvents ? (
        <LogView events={events} />
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {isLoading
            ? 'ログを読み込み中...'
            : isActive
              ? 'イベントを待ってるよ...'
              : '実行ログがまだないよ'}
        </div>
      )}
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
