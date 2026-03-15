// 探索ステータス設定
// 色・ラベル・アイコンを一元管理する
// タスクと共通の7ステータスモデル

import type { ExplorationStatus } from '@cognac/shared'
import type { LucideIcon } from 'lucide-react'
import { CheckCircle, Clock, Eye, Loader, MessageCircle, PauseCircle, XCircle } from 'lucide-react'
import type { BadgeProps } from '@/components/ui/badge'

// 削除可能なステータス
export const EXPLORATION_DELETABLE_STATUSES = new Set<ExplorationStatus>([
  'pending',
  'completed',
  'paused',
  'stopped',
])

// リトライ可能なステータス
export const EXPLORATION_RETRYABLE_STATUSES = new Set<ExplorationStatus>(['paused', 'stopped'])

// キャンセル可能なステータス
export const EXPLORATION_CANCELABLE_STATUSES = new Set<ExplorationStatus>([
  'pending',
  'discussing',
  'executing',
  'reviewing',
])

// 編集可能なステータス（サーバー側と一致）
export const EXPLORATION_EDITABLE_STATUSES = new Set<ExplorationStatus>([
  'pending',
  'completed',
  'paused',
  'stopped',
])

// アクティブ（実行中）なステータス
export const EXPLORATION_ACTIVE_STATUSES = new Set<ExplorationStatus>([
  'discussing',
  'executing',
  'reviewing',
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
  discussing: {
    label: 'Discussing',
    color: 'text-status-discussing',
    dotColor: 'bg-status-discussing',
    bgColor: 'bg-status-discussing-bg',
    borderColor: '',
    icon: MessageCircle,
    badgeVariant: 'discussing',
  },
  executing: {
    label: 'Executing',
    color: 'text-status-executing',
    dotColor: 'bg-status-executing',
    bgColor: 'bg-status-executing-bg',
    borderColor: 'border-status-executing/25',
    icon: Loader,
    badgeVariant: 'executing',
  },
  reviewing: {
    label: 'Reviewing',
    color: 'text-status-reviewing',
    dotColor: 'bg-status-reviewing',
    bgColor: 'bg-status-reviewing-bg',
    borderColor: '',
    icon: Eye,
    badgeVariant: 'reviewing',
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
  stopped: {
    label: 'Stopped',
    color: 'text-status-stopped',
    dotColor: 'bg-status-stopped',
    bgColor: 'bg-status-stopped-bg',
    borderColor: 'border-status-stopped/25',
    icon: XCircle,
    badgeVariant: 'stopped',
  },
}
