// 探索詳細ページ — ログタブ
// DB の永続ログを主表示にして、実行中だけ SSE イベントを補助表示する

import { useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ExplorationSession, ExplorationEvent } from '@cognac/shared'
import { useExplorationLogs } from '@/hooks/use-explorations'
import { LogEntry } from '@/components/log-entry'
import { getLivePhaseEvents } from '@/lib/live-phase-events'
import { EXPLORATION_ACTIVE_STATUSES } from '@/lib/exploration-status-config'

interface LogLine {
  label: string
  detail: string
  color: string
}

function formatExplorationEvent(event: ExplorationEvent): LogLine {
  switch (event.type) {
    case 'phase_start':
      return { label: `[${event.phase}]`, detail: 'Phase start', color: 'text-blue-600' }
    case 'phase_end':
      return {
        label: `[${event.phase}]`,
        detail: `Phase end (${Math.round(event.durationMs / 1000)}s)`,
        color: 'text-blue-600',
      }
    case 'persona_selected':
      return {
        label: '[persona]',
        detail: `Personas: ${event.personas.map((persona) => persona.name).join(', ')}`,
        color: 'text-purple-600',
      }
    case 'discussion_round_start':
      return { label: '[discuss]', detail: `Round ${event.round} start`, color: 'text-amber-600' }
    case 'discussion_statement':
      return { label: `[${event.personaName}]`, detail: event.content, color: 'text-foreground' }
    case 'discussion_round_end':
      return {
        label: '[discuss]',
        detail: `Round ${event.round} end — ${event.shouldContinue ? 'continue' : 'consensus'}`,
        color: 'text-amber-600',
      }
    case 'agent_output':
      return { label: '[agent]', detail: event.content, color: 'text-foreground' }
    case 'tool_invoked':
      return { label: '[tool]', detail: event.toolName, color: 'text-cyan-600' }
    case 'command_executed':
      return {
        label: '[cmd]',
        detail: `${event.command} → exit ${event.exitCode}`,
        color: event.exitCode === 0 ? 'text-green-600' : 'text-red-600',
      }
    case 'playwright_log':
      return { label: '[playwright]', detail: event.message, color: 'text-violet-600' }
    case 'artifact_created':
      return {
        label: '[artifact]',
        detail: `${event.kind}: ${event.title ?? event.path ?? ''}`,
        color: 'text-emerald-600',
      }
    case 'report_created':
      return { label: '[report]', detail: `Report created — ${event.issueCount} issues`, color: 'text-blue-600' }
    case 'taskify_started':
      return { label: '[taskify]', detail: `Job #${event.jobId} started`, color: 'text-blue-600' }
    case 'taskify_completed':
      return { label: '[taskify]', detail: `Job #${event.jobId} completed — ${event.taskIds.length} tasks`, color: 'text-green-600' }
    case 'taskify_failed':
      return { label: '[taskify]', detail: `Job #${event.jobId} failed: ${event.message}`, color: 'text-red-600' }
    case 'retry':
      return {
        label: '[retry]',
        detail: `${event.errorType} (${event.count}/${event.maxRetries}): ${event.reason}`,
        color: 'text-amber-600',
      }
    case 'paused':
      return { label: '[paused]', detail: `${event.phase}: ${event.reason}`, color: 'text-orange-600' }
    case 'error':
      return {
        label: '[error]',
        detail: `${event.phase ?? 'unknown'}: ${event.errorType}: ${event.message}`,
        color: 'text-red-600',
      }
    case 'completed':
      return {
        label: '[done]',
        detail: `${event.summary} (${Math.round(event.totalDurationMs / 1000)}s)`,
        color: 'text-green-600',
      }
  }
}

function ExplorationLogView({ events }: { events: ExplorationEvent[] }) {
  return (
    <div className="space-y-0.5">
      {events.map((event, index) => {
        const line = formatExplorationEvent(event)
        return (
          <div key={index} className="flex gap-2 py-0.5">
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

function useExplorationLogState(exploration: ExplorationSession, sseEvents: ExplorationEvent[]) {
  const isActive = EXPLORATION_ACTIVE_STATUSES.has(exploration.status)
  const qc = useQueryClient()
  const { data: logs, isLoading } = useExplorationLogs(exploration.id)

  // SSEで phase_end を受信したらDBログを再取得（新しいログ行が書き込まれたため）
  useEffect(() => {
    if (sseEvents.length === 0) return
    const last = sseEvents[sseEvents.length - 1]
    if (last?.type === 'phase_end') {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['explorations', exploration.id, 'logs'] })
      }, 500)
    }
  }, [sseEvents, exploration.id, qc])

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

interface LogsTabProps {
  exploration: ExplorationSession
  events: ExplorationEvent[]
  connected: boolean
}

function ExplorationLogsBody({
  exploration,
  events,
  connected,
  compact = false,
}: LogsTabProps & { compact?: boolean }) {
  const { logs, isLoading, isActive, liveEvents } = useExplorationLogState(exploration, events)
  const hasLogs = logs.length > 0
  const hasLiveEvents = liveEvents.length > 0

  return (
    <>
      {isActive && (
        <div className={`flex items-center gap-2 ${compact ? 'pb-2' : ''}`}>
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
          {compact && (
            <span className="text-xs text-muted-foreground">
              {connected ? 'リアルタイム接続中' : '接続待ち'}
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
          <ExplorationLogView events={liveEvents} />
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

export function PCLogsTab({ exploration, events, connected }: LogsTabProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        <div className="flex h-full flex-col overflow-y-auto px-4 py-3">
          <ExplorationLogsBody
            exploration={exploration}
            events={events}
            connected={connected}
          />
        </div>
      </div>
    </div>
  )
}

export function SPLogsTab({ exploration, events, connected }: LogsTabProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card px-4 py-3">
        <ExplorationLogsBody
          exploration={exploration}
          events={events}
          connected={connected}
          compact
        />
      </div>
    </div>
  )
}
