// 探索ステータス設定
// 色・ラベル・アイコンを一元管理する
// タスクステータスのCSS変数を再利用

import type { ExplorationStatus } from '@cognac/shared'
import type { LucideIcon } from 'lucide-react'
import type { BadgeProps } from '@/components/ui/badge'
import {
  Clock,
  Loader,
  CheckCircle,
  PauseCircle,
  XCircle,
} from 'lucide-react'

// 削除可能なステータス
export const EXPLORATION_DELETABLE_STATUSES = new Set<ExplorationStatus>([
  'pending',
  'completed',
  'failed',
])

// リトライ可能なステータス
export const EXPLORATION_RETRYABLE_STATUSES = new Set<ExplorationStatus>([
  'paused',
  'failed',
])

// アクティブ（実行中）なステータス
export const EXPLORATION_ACTIVE_STATUSES = new Set<ExplorationStatus>([
  'analyzing',
])

export const EXPLORATION_STATUS_CONFIG: Record<
  ExplorationStatus,
  {
    label: string
    color: string
    dotColor: string
    bgColor: string
    borderColor: string
    icon: LucideIcon
    badgeVariant: BadgeProps['variant']
  }
> = {
  pending: {
    label: 'Pending',
    color: 'text-status-pending',
    dotColor: 'bg-status-pending',
    bgColor: 'bg-status-pending-bg',
    borderColor: '',
    icon: Clock,
    badgeVariant: 'pending',
  },
  analyzing: {
    label: 'Analyzing',
    color: 'text-status-executing',
    dotColor: 'bg-status-executing',
    bgColor: 'bg-status-executing-bg',
    borderColor: 'border-status-executing/25',
    icon: Loader,
    badgeVariant: 'executing',
  },
  completed: {
    label: 'Completed',
    color: 'text-status-completed',
    dotColor: 'bg-status-completed',
    bgColor: 'bg-status-completed-bg',
    borderColor: '',
    icon: CheckCircle,
    badgeVariant: 'completed',
  },
  paused: {
    label: 'Paused',
    color: 'text-status-paused',
    dotColor: 'bg-status-paused',
    bgColor: 'bg-status-paused-bg',
    borderColor: '',
    icon: PauseCircle,
    badgeVariant: 'paused',
  },
  failed: {
    label: 'Failed',
    color: 'text-status-stopped',
    dotColor: 'bg-status-stopped',
    bgColor: 'bg-status-stopped-bg',
    borderColor: 'border-status-stopped/25',
    icon: XCircle,
    badgeVariant: 'stopped',
  },
}
