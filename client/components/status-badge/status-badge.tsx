// ステータスバッジ
// TaskStatus に応じたドット付きピル型バッジを表示する

import type { TaskStatus } from '@cognac/shared'
import { STATUS_CONFIG } from '@/lib/status-config'
import { cn } from '@/lib/utils'

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
        config.bgColor,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotColor)} />
      <span className={cn('text-xs font-medium leading-[1.3]', config.color)}>
        {config.label}
      </span>
    </span>
  )
}
