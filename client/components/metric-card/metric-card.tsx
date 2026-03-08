// メトリクスカード
// ダッシュボードでKPI表示 + フィルタートグルとして使うカード

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  /** active時のカード背景色 (例: "bg-[#eff6ff]") */
  activeBg?: string
  /** active時のボーダー色 (例: "border-[#2563eb]") */
  activeBorder?: string
  /** active時のラベル色 (例: "text-[#2563eb]") */
  activeLabelColor?: string
  /** active時の数値色 (例: "text-[#2563eb]") */
  activeValueColor?: string
  /** active時のアイコン色 (例: "text-[#2563eb]") */
  activeIconColor?: string
  active?: boolean
  onClick?: () => void
  className?: string
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  activeBg = 'bg-card',
  activeBorder = 'border-border',
  activeLabelColor = 'text-muted-foreground',
  activeValueColor = 'text-foreground',
  activeIconColor = 'text-muted-foreground',
  active = false,
  onClick,
  className,
}: MetricCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg text-left transition-all',
        active
          ? cn(activeBg, activeBorder, 'border-2 shadow-sm')
          : 'border bg-card shadow-sm',
        onClick && 'cursor-pointer hover:opacity-80',
        className,
      )}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span
            className={cn(
              'text-[13px] font-semibold leading-[1.3]',
              active ? activeLabelColor : 'text-muted-foreground',
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              'text-[28px] font-bold leading-[1.2]',
              active ? activeValueColor : 'text-foreground',
            )}
          >
            {value}
          </span>
        </div>
        <Icon
          className={cn(
            'h-5 w-5',
            active ? activeIconColor : 'text-muted-foreground',
          )}
        />
      </div>
    </button>
  )
}
