// SPメトリクスカード
// モバイル用のコンパクトなステータス集計カード + フィルタートグル

import { cn } from '@/lib/utils'

interface SPMetricProps {
  value: string | number
  label: string
  /** active時のテキスト色 (例: "text-[#2563eb]") */
  activeTextColor?: string
  /** active時の背景色 (例: "bg-[#eff6ff]") */
  activeBgColor?: string
  /** active時のボーダー色 (例: "border-[#2563eb]") */
  activeBorderColor?: string
  active?: boolean
  onClick?: () => void
  className?: string
}

export function SPMetric({
  value,
  label,
  activeTextColor = 'text-foreground',
  activeBgColor = 'bg-card',
  activeBorderColor = 'border-border',
  active = false,
  onClick,
  className,
}: SPMetricProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 transition-all',
        active
          ? cn(activeBgColor, activeBorderColor, 'border-2')
          : 'border bg-card border-border',
        onClick && 'cursor-pointer hover:opacity-80',
        className,
      )}
    >
      <span
        className={cn(
          'text-xl font-bold',
          active ? activeTextColor : 'text-foreground',
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          'text-[11px] font-semibold',
          active ? activeTextColor : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </button>
  )
}
