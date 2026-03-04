// タスク詳細ページ — 概要タブ
// デザイン design.pen PC=9d5bz, SP=lNPXJ に準拠

import { useState, useMemo } from 'react'
import { Check, User } from 'lucide-react'
import type { Task, TaskImage, TaskStatus } from '@cognac/shared'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { STATUS_CONFIG, STATUS_PHASE_MAP } from '@/lib/status-config'
import { useTaskImages, useTaskPersonas } from '@/hooks/use-tasks'
import { getPersonaColor } from '@/lib/persona-colors'

// --- 進捗ステップ ---

interface ProgressStep {
  label: string
  sub: string
  status: 'completed' | 'active' | 'waiting'
  number?: number
}

// paused_phaseからフェーズインデックスへの変換
const PAUSED_PHASE_INDEX: Record<string, number> = {
  persona: 0,
  discussion: 1,
  plan: 2,
  executing: 3,
  testing: 4,
}

// ステータスに対応するアクティブフェーズのインデックス
const ACTIVE_PHASE_INDEX: Partial<Record<TaskStatus, number>> = {
  pending: -1,
  discussing: 1, // 2-Aは完了、2-Bがアクティブ
  planned: 3,    // 2-A/2-B/2-Cは完了、Phase 3は待機
  executing: 3,
  testing: 4,
  completed: 5,  // 全完了
}

const PHASES = [
  { label: 'Phase 2-A: ペルソナ選択', phase: 'persona' },
  { label: 'Phase 2-B: マルチペルソナ議論', phase: 'discussion' },
  { label: 'Phase 2-C: プラン策定', phase: 'plan' },
  { label: 'Phase 3: コード実行', phase: 'executing' },
  { label: 'CI: テスト・検証', phase: 'testing' },
] as const

function buildProgressSteps(task: Task, personaCount: number): ProgressStep[] {
  const s = task.status as TaskStatus

  let activeIdx = ACTIVE_PHASE_INDEX[s] ?? -1

  // paused/stoppedはpaused_phaseに基づいてフェーズを決定
  if ((s === 'paused' || s === 'stopped') && task.paused_phase) {
    activeIdx = PAUSED_PHASE_INDEX[task.paused_phase] ?? -1
  }

  return PHASES.map((p, i) => {
    let status: 'completed' | 'active' | 'waiting'
    let sub: string

    if (i < activeIdx) {
      status = 'completed'
      sub = '完了'
    } else if (i === activeIdx) {
      if (s === 'completed') {
        status = 'completed'
        sub = '完了'
      } else if (s === 'paused' || s === 'stopped') {
        status = 'active'
        sub = s === 'paused' ? '一時停止中' : '停止'
      } else {
        status = 'active'
        sub = '進行中'
      }
    } else {
      status = 'waiting'
      sub = 'Pending'
    }

    // ペルソナ選択の補足情報
    if (i === 0 && status === 'completed' && personaCount > 0) {
      sub = `${personaCount}名選択済み — 完了`
    }

    return { label: p.label, sub, status, number: status === 'waiting' ? i + 1 : undefined }
  })
}

// --- 共通パーツ ---

function ProgressStepItem({
  step,
  size = 'md',
}: {
  step: ProgressStep
  size?: 'md' | 'sm'
}) {
  const iconSize = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
  const checkSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const dotSize = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
  const titleClass = 'text-[13px]'
  const subClass = 'text-xs'

  return (
    <div className="flex items-center gap-3">
      {step.status === 'completed' && (
        <div
          className={cn(
            iconSize,
            'flex shrink-0 items-center justify-center rounded-full bg-[#16a34a]',
          )}
        >
          <Check className={cn(checkSize, 'text-white')} />
        </div>
      )}
      {step.status === 'active' && (
        <div
          className={cn(
            iconSize,
            'flex shrink-0 items-center justify-center rounded-full bg-[#eab308]',
          )}
        >
          <div className={cn(dotSize, 'rounded-full bg-white')} />
        </div>
      )}
      {step.status === 'waiting' && (
        <div
          className={cn(
            iconSize,
            'flex shrink-0 items-center justify-center rounded-full bg-muted',
          )}
        >
          <span className="text-xs font-semibold text-muted-foreground">
            {step.number}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        <span
          className={cn(
            titleClass,
            'font-semibold leading-[1.4]',
            step.status === 'waiting'
              ? 'font-medium text-muted-foreground'
              : 'text-foreground',
          )}
        >
          {step.label}
        </span>
        <span
          className={cn(
            subClass,
            'leading-[1.4]',
            step.status === 'active'
              ? 'font-medium text-[#eab308]'
              : 'text-muted-foreground',
          )}
        >
          {step.sub}
        </span>
      </div>
    </div>
  )
}

// --- 画像セクション ---

function TaskImagesSection({ taskId, size = 'md' }: { taskId: number; size?: 'md' | 'sm' }) {
  const { data: images } = useTaskImages(taskId)
  const [enlarged, setEnlarged] = useState<TaskImage | null>(null)

  if (!images || images.length === 0) return null

  const thumbSize = size === 'sm' ? 'h-16 w-16' : 'h-20 w-20'

  return (
    <>
      <Card className={size === 'sm' ? 'p-4' : 'p-6'}>
        <h2 className={cn(
          'font-semibold text-foreground',
          size === 'sm' ? 'mb-3 text-[15px]' : 'mb-4 text-base',
        )}>
          添付画像
        </h2>
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setEnlarged(img)}
              className="group relative"
            >
              <img
                src={`/${img.file_path}`}
                alt={img.original_name}
                className={cn(thumbSize, 'rounded-lg object-cover border border-border hover:ring-2 hover:ring-blue-500 transition-all')}
              />
            </button>
          ))}
        </div>
      </Card>

      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-8"
          onClick={() => setEnlarged(null)}
        >
          <img
            src={`/${enlarged.file_path}`}
            alt={enlarged.original_name}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  )
}

// --- PC版 ---

export function PCOverviewTab({ task }: { task: Task }) {
  const { data: personas } = useTaskPersonas(task.id)
  const personaList = personas ?? []

  const progressSteps = useMemo(
    () => buildProgressSteps(task, personaList.length),
    [task, personaList.length],
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Task Information カード */}
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          タスク情報
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-30 shrink-0 text-[13px] font-medium text-muted-foreground">
              ステータス
            </span>
            <Badge variant={task.status}>
              {STATUS_CONFIG[task.status].label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-30 shrink-0 text-[13px] font-medium text-muted-foreground">
              現在のフェーズ
            </span>
            <span className="text-[13px] text-foreground">
              {task.paused_phase ?? STATUS_PHASE_MAP[task.status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-30 shrink-0 text-[13px] font-medium text-muted-foreground">
              ブランチ
            </span>
            <span className="text-[13px] text-[#2563eb]">
              {task.branch_name ?? '-'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-30 shrink-0 text-[13px] font-medium text-muted-foreground">
              作成日時
            </span>
            <span className="text-[13px] text-foreground">
              {formatDateTime(task.created_at)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-muted-foreground">
              説明
            </span>
            <p className="text-[13px] leading-[1.6] text-foreground">
              {task.description ?? '説明なし'}
            </p>
          </div>
        </div>
      </Card>

      {/* Attached Images */}
      <TaskImagesSection taskId={task.id} />

      {/* Selected Personas */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-foreground">
          選択されたペルソナ
        </h2>
        {personaList.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {personaList.map((persona, i) => (
              <Card key={persona.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: getPersonaColor(i) }}
                  >
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      {persona.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {persona.focus}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            タスクの実行待ち
          </p>
        )}
      </div>

      {/* Task Progress */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-foreground">
          タスク進捗
        </h2>
        <Card className="p-6">
          <div className="flex flex-col gap-5">
            {progressSteps.map((step) => (
              <ProgressStepItem key={step.label} step={step} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// --- SP版 ---

export function SPOverviewTab({ task }: { task: Task }) {
  const { data: personas } = useTaskPersonas(task.id)
  const personaList = personas ?? []

  const progressSteps = useMemo(
    () => buildProgressSteps(task, personaList.length),
    [task, personaList.length],
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Task Information */}
      <Card className="p-4">
        <h3 className="mb-3 text-[15px] font-semibold text-foreground">
          タスク情報
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
              ステータス
            </span>
            <Badge variant={task.status}>
              {STATUS_CONFIG[task.status].label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
              フェーズ
            </span>
            <span className="text-xs text-foreground">
              {task.paused_phase ?? STATUS_PHASE_MAP[task.status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
              ブランチ
            </span>
            <span className="text-xs text-[#2563eb]">
              {task.branch_name ?? '-'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              説明
            </span>
            <p className="text-xs leading-[1.5] text-foreground">
              {task.description ?? '説明なし'}
            </p>
          </div>
        </div>
      </Card>

      {/* Attached Images */}
      <TaskImagesSection taskId={task.id} size="sm" />

      {/* Personas */}
      <Card className="p-4">
        <h3 className="mb-3 text-[15px] font-semibold text-foreground">
          ペルソナ
        </h3>
        {personaList.length > 0 ? (
          <div className="flex flex-col gap-3">
            {personaList.map((persona, i) => (
              <div key={persona.id} className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: getPersonaColor(i) }}
                >
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[13px] font-medium text-foreground">
                  {persona.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            タスクの実行待ち
          </p>
        )}
      </Card>

      {/* Progress */}
      <Card className="p-4">
        <h3 className="mb-3 text-[15px] font-semibold text-foreground">
          進捗
        </h3>
        <div className="flex flex-col gap-2.5">
          {progressSteps.map((step) => (
            <ProgressStepItem key={step.label} step={step} size="sm" />
          ))}
        </div>
      </Card>
    </div>
  )
}
