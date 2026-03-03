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
    label: '停止',
    color: 'text-status-stopped',
    dotColor: 'bg-status-stopped',
    bgColor: 'bg-status-stopped-bg',
    borderColor: 'border-status-stopped/25',
    icon: XCircle,
  },
  paused: {
    label: '一時停止',
    color: 'text-status-paused',
    dotColor: 'bg-status-paused',
    bgColor: 'bg-status-paused-bg',
    borderColor: '',
    icon: PauseCircle,
  },
}
