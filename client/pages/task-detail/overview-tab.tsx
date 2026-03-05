// タスク詳細ページ — 概要タブ
// デザイン design.pen PC=9d5bz, SP=lNPXJ に準拠

import { useState } from 'react'
import type { Task, TaskImage } from '@cognac/shared'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { STATUS_CONFIG } from '@/lib/status-config'
import { useTaskImages } from '@/hooks/use-tasks'

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
    </div>
  )
}

// --- SP版 ---

export function SPOverviewTab({ task }: { task: Task }) {
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
    </div>
  )
}
