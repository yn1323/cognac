// タスク詳細ページ — CIタブ
// デザイン design.pen PC=MIuKS, SP=09sQT に準拠

import { useMemo } from 'react'
import { Check, ExternalLink, Loader, XCircle } from 'lucide-react'
import type { Task, TaskEvent, ExecutionLog } from '@cognac/shared'
import { useTaskLogs } from '@/hooks/use-tasks'
import { ACTIVE_STATUSES } from '@/lib/status-config'
import { formatDuration } from '@/lib/format'

// SSEイベントからCIステップを抽出
interface CiStepStatus {
  step: string
  command?: string
  status: 'running' | 'success' | 'failure'
  output?: string
  durationMs?: number
}

function extractCiSteps(events: TaskEvent[]): CiStepStatus[] {
  const stepMap = new Map<string, CiStepStatus>()
  const order: string[] = []
  for (const e of events) {
    if (e.type === 'ci_start') {
      const entry: CiStepStatus = { step: e.step, command: e.command, status: 'running' }
      stepMap.set(e.step, entry)
      if (!order.includes(e.step)) order.push(e.step)
    }
    if (e.type === 'ci_result') {
      const existing = stepMap.get(e.step)
      if (existing) {
        existing.status = e.success ? 'success' : 'failure'
        existing.output = e.output
        existing.durationMs = e.durationMs
      } else {
        stepMap.set(e.step, {
          step: e.step,
          status: e.success ? 'success' : 'failure',
          output: e.output,
          durationMs: e.durationMs,
        })
        if (!order.includes(e.step)) order.push(e.step)
      }
    }
  }
  return order.map((k) => stepMap.get(k)!)
}

// ステータスアイコン
function StepIcon({ status, size = 'md' }: { status: CiStepStatus['status']; size?: 'md' | 'sm' }) {
  const cls = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  if (status === 'running') return <Loader className={`${cls} text-[#2563eb]`} />
  if (status === 'success') return <Check className={`${cls} text-[#16a34a]`} />
  return <XCircle className={`${cls} text-[#dc2626]`} />
}

// バナーの色設定
const BANNER_RUNNING = { border: 'border-[#2563eb30]', bg: 'bg-[#eff6ff]', text: 'text-[#1e40af]', sub: 'text-[#3b82f6]' } as const
const BANNER_RUNNING_SP = { border: 'border-[#2563eb30]', bg: 'bg-[#dbeafe]', text: 'text-[#1e40af]', sub: 'text-[#3b82f6]' } as const
const BANNER_FAILURE = { border: 'border-[#dc262630]', bg: 'bg-[#fef2f2]', text: 'text-[#991b1b]', sub: 'text-[#dc2626]' } as const
const BANNER_SUCCESS = { border: 'border-[#16a34a30]', bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', sub: 'text-[#16a34a]' } as const

function getBannerStyle(steps: CiStepStatus[], variant: 'pc' | 'sp') {
  const hasFailed = steps.some((s) => s.status === 'failure')
  const allDone = steps.length > 0 && steps.every((s) => s.status !== 'running')
  if (hasFailed) return BANNER_FAILURE
  if (allDone) return BANNER_SUCCESS
  return variant === 'sp' ? BANNER_RUNNING_SP : BANNER_RUNNING
}

// 共通データフック: PC/SPで同じデータロジックを共有
function useCITabData(task: Task, events: TaskEvent[]) {
  const isActive = ACTIVE_STATUSES.has(task.status)
  const steps = useMemo(
    () => (isActive ? extractCiSteps(events) : []),
    [isActive, events],
  )

  // 完了タスクのみDBログを取得
  const { data: logs } = useTaskLogs(task.id, !isActive)
  const ciLogs = useMemo(
    () => (logs ?? []).filter((l) => l.phase === 'ci'),
    [logs],
  )

  const hasCiData = steps.length > 0 || ciLogs.length > 0

  return { isActive, steps, ciLogs, hasCiData }
}

// --- PC版 ---

export function PCCITab({ task, events }: { task: Task; events: TaskEvent[] }) {
  const { isActive, steps, ciLogs, hasCiData } = useCITabData(task, events)

  if (!hasCiData && !isActive) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        CI実行を待っています
      </p>
    )
  }

  if (!hasCiData && isActive) {
    return (
      <div className="flex flex-col gap-6">
        <div className={`flex items-center gap-3 rounded-lg border ${BANNER_RUNNING.border} ${BANNER_RUNNING.bg} px-4 py-3`}>
          <Loader className="h-[18px] w-[18px] shrink-0 text-[#2563eb]" />
          <span className={`text-[13px] font-medium leading-[1.4] ${BANNER_RUNNING.text}`}>
            CI実行を待っています
          </span>
        </div>
      </div>
    )
  }

  // アクティブタスクのSSEベース表示
  if (isActive && steps.length > 0) {
    const banner = getBannerStyle(steps, 'pc')
    const running = steps.filter((s) => s.status === 'running').length
    const done = steps.filter((s) => s.status !== 'running').length

    return (
      <div className="flex flex-col gap-6">
        {/* ステータスバナー */}
        <div className={`flex items-center gap-3 rounded-lg border ${banner.border} ${banner.bg} px-4 py-3`}>
          <Loader className="h-[18px] w-[18px] shrink-0 text-[#2563eb]" />
          <div className="flex flex-col gap-0.5">
            <span className={`text-[13px] font-semibold leading-[1.4] ${banner.text}`}>
              CI実行中
            </span>
            <span className={`text-xs leading-[1.4] ${banner.sub}`}>
              {done}/{steps.length} ステップ完了{running > 0 ? ` · ${running} 実行中` : ''}
              {task.retry_count > 0 ? ` · 試行 ${task.retry_count + 1}` : ''}
            </span>
          </div>
        </div>

        {/* CI ステップ一覧 */}
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          {steps.map((step) => (
            <div key={step.step} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <StepIcon status={step.status} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold leading-[1.4] text-foreground">
                    {step.step}
                  </span>
                  {step.command && (
                    <span className="text-xs leading-[1.4] text-muted-foreground">
                      {step.command}
                    </span>
                  )}
                </div>
              </div>
              {step.durationMs != null && (
                <span className="text-xs leading-[1.4] text-muted-foreground">
                  {formatDuration(step.durationMs)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Logs リンク */}
        <div className="flex items-center gap-1.5">
          <ExternalLink className="h-3.5 w-3.5 text-primary" />
          <span className="text-[13px] leading-[1.4] text-muted-foreground">
            実行ログの詳細はログタブで確認できます
          </span>
        </div>
      </div>
    )
  }

  // 完了タスクのDBログベース表示
  return <CILogsList ciLogs={ciLogs} variant="pc" />
}

// --- SP版 ---

export function SPCITab({ task, events }: { task: Task; events: TaskEvent[] }) {
  const { isActive, steps, ciLogs, hasCiData } = useCITabData(task, events)

  if (!hasCiData && !isActive) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        CI実行を待っています
      </p>
    )
  }

  if (!hasCiData && isActive) {
    return (
      <div className="flex flex-col gap-3">
        <div className={`flex items-center gap-2 rounded-lg border ${BANNER_RUNNING_SP.border} ${BANNER_RUNNING_SP.bg} px-3 py-2.5`}>
          <Loader className="h-4 w-4 shrink-0 text-[#2563eb]" />
          <span className={`text-xs font-semibold leading-[1.4] ${BANNER_RUNNING_SP.text}`}>
            CI実行を待っています
          </span>
        </div>
      </div>
    )
  }

  // アクティブタスクのSSEベース表示
  if (isActive && steps.length > 0) {
    const done = steps.filter((s) => s.status !== 'running').length

    return (
      <div className="flex flex-col gap-3">
        <div className={`flex items-center justify-between rounded-lg border ${BANNER_RUNNING_SP.border} ${BANNER_RUNNING_SP.bg} px-3 py-2.5`}>
          <div className="flex items-center gap-2">
            <Loader className="h-4 w-4 shrink-0 text-[#2563eb]" />
            <span className={`text-xs font-semibold leading-[1.4] ${BANNER_RUNNING_SP.text}`}>
              CI実行中 — {done}/{steps.length}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border bg-card p-3.5">
          {steps.map((step) => (
            <div key={step.step} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StepIcon status={step.status} size="sm" />
                <span className="text-[13px] font-semibold leading-[1.4] text-foreground">
                  {step.step}
                </span>
              </div>
              {step.durationMs != null && (
                <span className="text-xs text-muted-foreground">
                  {formatDuration(step.durationMs)}
                </span>
              )}
            </div>
          ))}
          {task.retry_count > 0 && (
            <span className="text-[11px] leading-[1.4] text-muted-foreground">
              試行 {task.retry_count + 1}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <ExternalLink className="h-3 w-3 text-primary" />
          <span className="text-xs leading-[1.4] text-muted-foreground">
            詳細はログタブで確認
          </span>
        </div>
      </div>
    )
  }

  // 完了タスクのDBログベース表示
  return <CILogsList ciLogs={ciLogs} variant="sp" />
}

// --- 完了タスクのDBログ表示（PC/SP共通） ---

function CILogsList({ ciLogs, variant }: { ciLogs: ExecutionLog[]; variant: 'pc' | 'sp' }) {
  const isPC = variant === 'pc'
  const gap = isPC ? 'gap-6' : 'gap-3'
  const padding = isPC ? 'px-4 py-3' : 'px-3 py-2.5'
  const cardPadding = isPC ? 'gap-3 p-4' : 'gap-2 p-3.5'
  const iconSize = isPC ? 'h-5 w-5' : 'h-4 w-4'
  const bannerIconSize = isPC ? 'h-[18px] w-[18px]' : 'h-4 w-4'
  const labelClass = isPC ? 'text-sm font-semibold' : 'text-[13px] font-semibold'
  const bannerLabelClass = isPC ? 'text-[13px] font-medium' : 'text-xs font-semibold'

  return (
    <div className={`flex flex-col ${gap}`}>
      <div className={`flex items-center gap-${isPC ? '3' : '2'} rounded-lg border ${BANNER_SUCCESS.border} ${BANNER_SUCCESS.bg} ${padding}`}>
        <Check className={`${bannerIconSize} shrink-0 text-[#16a34a]`} />
        <span className={`${bannerLabelClass} leading-[1.4] ${BANNER_SUCCESS.text}`}>
          CI完了 — {ciLogs.length} ステップ{isPC ? '実行' : ''}
        </span>
      </div>

      <div className={`flex flex-col rounded-lg border bg-card ${cardPadding}`}>
        {ciLogs.map((log) => (
          <div key={log.id} className="flex items-center justify-between">
            <div className={`flex items-center gap-${isPC ? '2.5' : '2'}`}>
              {log.error_type ? (
                <XCircle className={`${iconSize} text-[#dc2626]`} />
              ) : (
                <Check className={`${iconSize} text-[#16a34a]`} />
              )}
              <span className={`${labelClass} leading-[1.4] text-foreground`}>
                {log.output_summary ?? 'CI ステップ'}
              </span>
            </div>
            {log.duration_ms != null && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(log.duration_ms)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
