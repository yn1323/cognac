// ステータスバッジ（ジェネリック）
// 任意のステータス文字列型に対応するドット付きピル型バッジ

import type { StatusConfigEntry } from '@/lib/status-config'
import { cn } from '@/lib/utils'

export function StatusBadge<S extends string>({
  status,
  configMap,
  className,
}: {
  status: S
  configMap: Record<S, StatusConfigEntry>
  className?: string
}) {
  const config = configMap[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
        config.bgColor,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotColor)} />
      <span className={cn('text-xs font-medium leading-[1.3]', config.color)}>{config.label}</span>
    </span>
  )
}
