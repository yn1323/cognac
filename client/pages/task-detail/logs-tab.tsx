// タスク詳細ページ — ログタブ
// アクティブ: SSEイベントをリアルタイム表示（親コンポーネントからprops経由）
// 非アクティブ: DB履歴ログを表示
// デザイン design.pen PC=ndNzU, SP=cZcuS に準拠

import { useState, useMemo } from 'react'
import type { Task, TaskEvent, ExecutionLog, Phase } from '@cognac/shared'
import { useTaskLogs } from '@/hooks/use-tasks'
import { LogView } from '@/components/log-view'
import { ACTIVE_STATUSES, PHASE_LABELS } from '@/lib/status-config'

interface LogsTabProps {
  task: Task
  events: TaskEvent[]
  connected: boolean
}

// phase_start〜phase_endの範囲内のイベントだけ抽出する
function filterByPhase(events: TaskEvent[], targetPhase: Phase): TaskEvent[] {
  let inPhase = false
  return events.filter((e) => {
    if (e.type === 'phase_start' && e.phase === targetPhase) {
      inPhase = true
      return true
    }
    if (e.type === 'phase_end' && e.phase === targetPhase) {
      inPhase = false
      return true
    }
    return inPhase
  })
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

// DB履歴ログの表示（output_rawがあればLogViewで、なければサマリー表示）
function HistoryLogView({ taskId }: { taskId: number }) {
  const { data: logs, isLoading } = useTaskLogs(taskId)

  // output_rawにSSEイベントJSONが保存されていればリッチ表示
  const allEvents = useMemo(() => {
    if (!logs) return []
    const events: TaskEvent[] = []
    for (const log of logs) {
      if (log.output_raw) {
        try {
          const parsed = JSON.parse(log.output_raw) as TaskEvent[]
          events.push(...parsed)
        } catch {
          // パース失敗はスキップ
        }
      }
    }
    return events
  }, [logs])

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        ログを読み込み中...
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        実行ログがまだないよ
      </div>
    )
  }

  if (allEvents.length > 0) {
    return <LogView events={allEvents} />
  }

  // output_rawがなければサマリー表示にフォールバック
  return (
    <div className="space-y-0">
      {logs.map((log) => (
        <LogEntry key={log.id} log={log} />
      ))}
    </div>
  )
}

// --- PC版 ---

export function PCLogsTab({ task, events, connected }: LogsTabProps) {
  const isActive = ACTIVE_STATUSES.has(task.status)
  const [phaseFilter, setPhaseFilter] = useState<Phase | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = events
    if (phaseFilter !== 'all') {
      result = filterByPhase(result, phaseFilter)
    }
    if (search) {
      const lower = search.toLowerCase()
      result = result.filter((e) => {
        if (e.type === 'claude_output') return e.content.toLowerCase().includes(lower)
        if (e.type === 'file_changed') return e.path.toLowerCase().includes(lower)
        if (e.type === 'command_executed') return e.command.toLowerCase().includes(lower)
        if (e.type === 'error') return e.message.toLowerCase().includes(lower)
        if (e.type === 'ci_result') return e.step.toLowerCase().includes(lower)
        return false
      })
    }
    return result
  }, [events, phaseFilter, search])

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ツールバー */}
      <div className="flex items-center gap-2">
        {/* 接続インジケーター */}
        {isActive && (
          <div
            className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted-foreground'}`}
            title={connected ? 'リアルタイム接続中' : '未接続'}
          />
        )}
        {/* フェーズ選択（リアルタイム時のみ） */}
        {isActive && (
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as Phase | 'all')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="all">全フェーズ</option>
            {(Object.entries(PHASE_LABELS) as [Phase, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        )}
        {/* 検索（リアルタイム時のみ） */}
        {isActive && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ログを検索..."
            className="h-9 w-60 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        )}
      </div>

      {/* ログビュー */}
      <div className="flex-1 overflow-hidden rounded-lg border bg-card">
        <div className="flex h-full flex-col overflow-y-auto px-4 py-3">
          {isActive ? (
            <LogView events={filtered} />
          ) : (
            <HistoryLogView taskId={task.id} />
          )}
        </div>
      </div>
    </div>
  )
}

// --- SP版 ---

export function SPLogsTab({ task, events, connected }: LogsTabProps) {
  const isActive = ACTIVE_STATUSES.has(task.status)

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
      <div className="flex-1 overflow-y-auto rounded-lg border bg-card px-4 py-3">
        {isActive ? (
          <LogView events={events} />
        ) : (
          <HistoryLogView taskId={task.id} />
        )}
      </div>
    </div>
  )
}
