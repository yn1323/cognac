// ステータス設定
// 色・ラベル・アイコンを一元管理する

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
    color: string // text-[#xxx] 形式（テキスト・アイコン用）
    dotColor: string // bg-[#xxx] 形式（ドット用）
    bgColor: string // bg-[#xxx] 形式（バッジ背景用）
    icon: LucideIcon
  }
> = {
  executing: { label: '実行中', color: 'text-[#2563eb]', dotColor: 'bg-[#2563eb]', bgColor: 'bg-[#dbeafe]', icon: Loader },
  discussing: { label: '議論中', color: 'text-[#d97706]', dotColor: 'bg-[#d97706]', bgColor: 'bg-[#fef3c7]', icon: MessageCircle },
  pending: { label: '待機中', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground', bgColor: 'bg-secondary', icon: GripVertical },
  planned: { label: '計画済', color: 'text-[#7c3aed]', dotColor: 'bg-[#7c3aed]', bgColor: 'bg-[#ede9fe]', icon: Lightbulb },
  testing: { label: 'テスト中', color: 'text-[#ca8a04]', dotColor: 'bg-[#ca8a04]', bgColor: 'bg-[#fef3c7]', icon: FlaskConical },
  completed: { label: '完了', color: 'text-[#16a34a]', dotColor: 'bg-[#16a34a]', bgColor: 'bg-[#dcfce7]', icon: CheckCircle },
  stopped: { label: '停止', color: 'text-[#ef4444]', dotColor: 'bg-[#ef4444]', bgColor: 'bg-[#fef2f2]', icon: XCircle },
  paused: { label: '一時停止', color: 'text-[#ea580c]', dotColor: 'bg-[#ea580c]', bgColor: 'bg-[#fff7ed]', icon: PauseCircle },
}
