// 実行ログのリアルタイム表示
// SSEイベントを時系列で表示する

import { useEffect, useRef } from 'react'
import type { TaskEvent } from '@cognac/shared'
import { cn } from '@/lib/utils'

// イベントを表示用テキストに変換する
function formatEvent(event: TaskEvent): { label: string; detail: string; color: string } {
  switch (event.type) {
    case 'phase_start':
      return { label: 'Phase', detail: `${event.phase} 開始`, color: 'text-blue-600' }
    case 'phase_end':
      return { label: 'Phase', detail: `${event.phase} 完了 (${event.durationMs}ms)`, color: 'text-blue-600' }
    case 'claude_output':
      return { label: 'Claude', detail: event.content.slice(0, 200), color: 'text-foreground' }
    case 'file_changed':
      return { label: 'File', detail: `${event.toolName}: ${event.path}`, color: 'text-green-600' }
    case 'command_executed':
      return {
        label: 'Cmd',
        detail: `${event.command} → exit ${event.exitCode}`,
        color: event.exitCode === 0 ? 'text-green-600' : 'text-red-600',
      }
    case 'tool_invoked':
      return { label: 'Tool', detail: event.toolName, color: 'text-muted-foreground' }
    case 'ci_start':
      return { label: 'CI', detail: `${event.step}: ${event.command}`, color: 'text-orange-600' }
    case 'ci_result':
      return {
        label: 'CI',
        detail: `${event.step}: ${event.success ? '成功' : '失敗'} (${event.durationMs}ms)`,
        color: event.success ? 'text-green-600' : 'text-red-600',
      }
    case 'retry':
      return {
        label: 'Retry',
        detail: `${event.reason} (${event.count}/${event.maxRetries})`,
        color: 'text-orange-600',
      }
    case 'error':
      return { label: 'Error', detail: event.message, color: 'text-red-600' }
    case 'paused':
      return { label: 'Paused', detail: event.reason, color: 'text-red-600' }
    case 'git_operation':
      return { label: 'Git', detail: `${event.operation}: ${event.detail}`, color: 'text-purple-600' }
    case 'debug_log':
      return {
        label: 'Debug',
        detail: event.message,
        color: event.level === 'error' ? 'text-red-600' : event.level === 'warn' ? 'text-yellow-600' : 'text-muted-foreground',
      }
    case 'completed':
      return { label: 'Done', detail: event.summary, color: 'text-green-700' }
    default:
      return { label: 'Event', detail: JSON.stringify(event), color: 'text-muted-foreground' }
  }
}

export function LogView({ events }: { events: TaskEvent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // 新しいイベントが来たら自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length])

  if (events.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        イベントを待ってるよ...
      </div>
    )
  }

  return (
    <div className="space-y-1 font-mono text-xs">
      {events.map((event, i) => {
        const { label, detail, color } = formatEvent(event)
        return (
          <div key={i} className="flex gap-2 py-1 border-b border-border/50">
            <span className={cn('shrink-0 w-14 font-semibold', color)}>[{label}]</span>
            <span className="break-all">{detail}</span>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
