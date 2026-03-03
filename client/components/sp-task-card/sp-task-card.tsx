// SPタスクカード
// モバイル用タスクカード。タイトル + バッジ + サブテキスト + アクション

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SPTaskCardProps {
  title: string
  subtitle: string
  badge: ReactNode
  actions?: ReactNode
  borderColor?: string
  className?: string
}

export function SPTaskCard({
  title,
  subtitle,
  badge,
  actions,
  borderColor = 'border-border',
  className,
}: SPTaskCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border bg-card p-3.5',
        borderColor,
        className,
      )}
    >
      {/* ヘッダー: タイトル + バッジ */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold leading-[1.4] text-foreground">
          {title}
        </span>
        {badge}
      </div>

      {/* サブテキスト */}
      <span className="text-xs leading-[1.4] text-muted-foreground">
        {subtitle}
      </span>

      {/* アクション（任意） */}
      {actions && (
        <div className="flex items-center justify-end">{actions}</div>
      )}
    </div>
  )
}
