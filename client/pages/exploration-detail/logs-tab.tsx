// 探索詳細ページ — ログタブ
// フィルターなしで全ログ表示（ユーザー指示：コード正）
// タスクのlogs-tab.tsxと同じパターン

import type { ExplorationSession, ExplorationEvent } from '@cognac/shared'

// --- イベントフォーマッター ---

interface LogLine {
  label: string
  detail: string
  color: string
}

function formatExplorationEvent(event: ExplorationEvent): LogLine {
  switch (event.type) {
    case 'phase_start':
      return { label: `[${event.phase}]`, detail: `Phase start`, color: 'text-blue-600' }
    case 'phase_end':
      return { label: `[${event.phase}]`, detail: `Phase end (${Math.round(event.durationMs / 1000)}s)`, color: 'text-blue-600' }
    case 'persona_selected':
      return { label: '[persona]', detail: `Personas: ${event.personas.map(p => p.name).join(', ')}`, color: 'text-purple-600' }
    case 'discussion_round_start':
      return { label: '[discuss]', detail: `Round ${event.round} start`, color: 'text-amber-600' }
    case 'discussion_statement':
      return { label: `[${event.personaName}]`, detail: event.content, color: 'text-foreground' }
    case 'discussion_round_end':
      return { label: '[discuss]', detail: `Round ${event.round} end — ${event.shouldContinue ? 'continue' : 'consensus'}`, color: 'text-amber-600' }
    case 'agent_output':
      return { label: '[agent]', detail: event.content, color: 'text-foreground' }
    case 'tool_invoked':
      return { label: '[tool]', detail: event.toolName, color: 'text-cyan-600' }
    case 'command_executed':
      return { label: '[cmd]', detail: `${event.command} → exit ${event.exitCode}`, color: event.exitCode === 0 ? 'text-green-600' : 'text-red-600' }
    case 'playwright_log':
      return { label: '[playwright]', detail: event.message, color: 'text-violet-600' }
    case 'artifact_created':
      return { label: '[artifact]', detail: `${event.kind}: ${event.title ?? event.path ?? ''}`, color: 'text-emerald-600' }
    case 'report_created':
      return { label: '[report]', detail: `Report created — ${event.issueCount} issues`, color: 'text-blue-600' }
    case 'taskify_started':
      return { label: '[taskify]', detail: `Job #${event.jobId} started`, color: 'text-blue-600' }
    case 'taskify_completed':
      return { label: '[taskify]', detail: `Job #${event.jobId} completed — ${event.taskIds.length} tasks`, color: 'text-green-600' }
    case 'taskify_failed':
      return { label: '[taskify]', detail: `Job #${event.jobId} failed: ${event.message}`, color: 'text-red-600' }
    case 'retry':
      return { label: '[retry]', detail: `${event.errorType} (${event.count}/${event.maxRetries}): ${event.reason}`, color: 'text-amber-600' }
    case 'paused':
      return { label: '[paused]', detail: `${event.phase}: ${event.reason}`, color: 'text-orange-600' }
    case 'error':
      return { label: '[error]', detail: `${event.errorType}: ${event.message}`, color: 'text-red-600' }
    case 'completed':
      return { label: '[done]', detail: `${event.summary} (${Math.round(event.totalDurationMs / 1000)}s)`, color: 'text-green-600' }
  }
}

// --- 共通ログビュー ---

function ExplorationLogView({ events }: { events: ExplorationEvent[] }) {
  return (
    <div className="space-y-0.5">
      {events.map((event, i) => {
        const line = formatExplorationEvent(event)
        return (
          <div key={i} className="flex gap-2 py-0.5">
            <span className={`shrink-0 font-mono text-xs font-semibold ${line.color}`}>
              {line.label}
            </span>
            <span className="min-w-0 flex-1 font-mono text-xs text-foreground">
              {line.detail}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// --- 共通props ---

interface LogsTabProps {
  exploration: ExplorationSession
  events: ExplorationEvent[]
  connected: boolean
}

// --- PC版 ---

export function PCLogsTab({ exploration, events, connected }: LogsTabProps) {
  const isActive = exploration.status === 'analyzing'

  return (
    <div className="flex h-full flex-col gap-4">
      {isActive && (
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted-foreground'}`} title={connected ? 'リアルタイム接続中' : '接続待ち'} />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        <div className="flex h-full flex-col overflow-y-auto px-4 py-3">
          {events.length > 0 ? (
            <ExplorationLogView events={events} />
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

export function SPLogsTab({ exploration, events, connected }: LogsTabProps) {
  const isActive = exploration.status === 'analyzing'

  return (
    <div className="flex flex-1 flex-col">
      {isActive && (
        <div className="flex items-center gap-2 pb-2">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
          <span className="text-xs text-muted-foreground">
            {connected ? 'リアルタイム接続中' : '接続待ち'}
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card px-4 py-3">
        {events.length > 0 ? (
          <ExplorationLogView events={events} />
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {isActive ? 'イベントを待ってるよ...' : '実行ログがまだないよ'}
          </div>
        )}
      </div>
    </div>
  )
}
