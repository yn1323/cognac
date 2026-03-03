// ステータスバッジ
// TaskStatus に応じた色付きバッジを表示する

import type { TaskStatus } from '@cognac/shared'
import { Badge } from '@/components/ui/badge'

// ステータスの日本語ラベル
const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '待機中',
  discussing: '議論中',
  planned: '計画済',
  executing: '実行中',
  testing: 'テスト中',
  completed: '完了',
  paused: '一時停止',
  stopped: '停止',
}

// Badge の variant にそのまま渡せるようにする
type StatusVariant = TaskStatus

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant={status as StatusVariant}>{STATUS_LABELS[status]}</Badge>
  )
}
