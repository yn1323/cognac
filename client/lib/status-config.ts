// ステータス設定
// 色・ラベル・アイコンを一元管理する
// カラートークンは index.css の CSS変数を参照（ダークモード自動対応）

import type { TaskStatus } from '@cognac/shared'
import type { LucideIcon } from 'lucide-react'
import {
  Loader,
  MessageCircle,
  GripVertical,
  CheckCircle,
  XCircle,
  FlaskConical,
  Lightbulb,
  PauseCircle,
} from 'lucide-react'

// 削除可能なステータス
export const DELETABLE_STATUSES = new Set<TaskStatus>(['pending', 'stopped', 'completed'])

// リトライ可能なステータス
export const RETRYABLE_STATUSES = new Set<TaskStatus>(['stopped', 'paused'])

// ステータス → フェーズ表示名のマッピング
export const STATUS_PHASE_MAP: Record<TaskStatus, string> = {
  pending: 'Queued',
  discussing: 'Phase 2-B: Discussing',
  planned: 'Phase 2-C: Planned',
  executing: 'Phase 3: Executing',
  testing: 'Phase 4: CI Testing',
  completed: 'Completed',
  paused: 'Paused',
  stopped: 'Stopped',
}

export const STATUS_CONFIG: Record<
  TaskStatus,
  {
    label: string
    color: string // テキスト・アイコン用 Tailwindクラス
    dotColor: string // ドット用 Tailwindクラス
    bgColor: string // バッジ背景用 Tailwindクラス
    borderColor: string // ボーダー用 Tailwindクラス
    icon: LucideIcon
  }
> = {
  executing: {
    label: 'Executing',
    color: 'text-status-executing',
    dotColor: 'bg-status-executing',
    bgColor: 'bg-status-executing-bg',
    borderColor: 'border-status-executing/25',
    icon: Loader,
  },
  discussing: {
    label: 'Discussing',
    color: 'text-status-discussing',
    dotColor: 'bg-status-discussing',
    bgColor: 'bg-status-discussing-bg',
    borderColor: '',
    icon: MessageCircle,
  },
  pending: {
    label: 'Pending',
    color: 'text-status-pending',
    dotColor: 'bg-status-pending',
    bgColor: 'bg-status-pending-bg',
    borderColor: '',
    icon: GripVertical,
  },
  planned: {
    label: 'Planned',
    color: 'text-status-planned',
    dotColor: 'bg-status-planned',
    bgColor: 'bg-status-planned-bg',
    borderColor: '',
    icon: Lightbulb,
  },
  testing: {
    label: 'Testing',
    color: 'text-status-testing',
    dotColor: 'bg-status-testing',
    bgColor: 'bg-status-testing-bg',
    borderColor: '',
    icon: FlaskConical,
  },
  completed: {
    label: 'Completed',
    color: 'text-status-completed',
    dotColor: 'bg-status-completed',
    bgColor: 'bg-status-completed-bg',
    borderColor: '',
    icon: CheckCircle,
  },
  stopped: {
    label: 'Stopped',
    color: 'text-status-stopped',
    dotColor: 'bg-status-stopped',
    bgColor: 'bg-status-stopped-bg',
    borderColor: 'border-status-stopped/25',
    icon: XCircle,
  },
  paused: {
    label: 'Paused',
    color: 'text-status-paused',
    dotColor: 'bg-status-paused',
    bgColor: 'bg-status-paused-bg',
    borderColor: '',
    icon: PauseCircle,
  },
}
