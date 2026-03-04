// タスクカード
// タスク一覧で表示するカード。タップで詳細ページへ遷移する
// デザインの Task Card コンポーネントに準拠

import { Link } from 'react-router-dom'
import type { Task } from '@cognac/shared'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/format'
import { STATUS_CONFIG } from '@/lib/status-config'
import { cn } from '@/lib/utils'

// フェーズ表示テキスト
function getPhaseText(task: Task): string | null {
  if (task.status === 'discussing') return 'Discussing'
  if (task.status === 'executing') return 'Phase 3 Executing'
  if (task.status === 'testing') return 'Testing'
  return null
}

interface TaskCardProps {
  task: Task
  onRetry?: (taskId: number) => void
}

export function TaskCard({ task, onRetry }: TaskCardProps) {
  const config = STATUS_CONFIG[task.status]
  const phaseText = getPhaseText(task)
  const borderClass = config.borderColor

  return (
    <Link to={`/tasks/${task.id}`} className="block">
      <div
        className={cn(
          'flex gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md',
          borderClass,
          task.status === 'completed' && 'opacity-70',
        )}
      >
        {/* 情報エリア */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* 1行目: バッジ + フェーズ */}
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            {phaseText && (
              <span className="text-xs leading-[1.3] text-muted-foreground">
                {phaseText}
              </span>
            )}
          </div>

          {/* タイトル */}
          <span className="text-sm font-medium leading-[1.4] text-foreground">
            {task.title}
          </span>

          {/* 説明 */}
          {task.description && (
            <p className="line-clamp-2 text-[13px] leading-[1.4] text-muted-foreground">
              {task.description}
            </p>
          )}

          {/* メタ情報 */}
          <div className="flex items-center gap-3">
            <span className="text-xs leading-[1.3] text-muted-foreground">
              {formatRelativeTime(task.started_at ?? task.created_at)}
            </span>

            {/* リトライ回数 */}
            {task.retry_count > 0 && task.status === 'stopped' && (
              <span className="text-xs font-medium text-status-stopped">
                CI失敗 ({task.retry_count}/5)
              </span>
            )}
          </div>
        </div>

        {/* Stopped状態ではリトライボタンを表示 */}
        {task.status === 'stopped' && (
          <Button
            variant="outline"
            size="sm"
            className="h-auto self-center px-2.5 py-1 text-xs"
            onClick={(e) => {
              e.preventDefault()
              onRetry?.(task.id)
            }}
          >
            リトライ
          </Button>
        )}

        {/* ステータスアイコン */}
        <div className="flex flex-col items-center self-center">
          <config.icon className={cn('h-5 w-5', config.color)} />
        </div>
      </div>
    </Link>
  )
}
