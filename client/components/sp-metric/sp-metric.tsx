// SPメトリクスカード
// モバイル用のコンパクトなステータス集計カード

import { cn } from '@/lib/utils'

interface SPMetricProps {
  value: string | number
  label: string
  textColor?: string
  bgColor?: string
  borderColor?: string
  className?: string
}

export function SPMetric({
  value,
  label,
  textColor = 'text-foreground',
  bgColor = 'bg-card',
  borderColor = 'border-border',
  className,
}: SPMetricProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5',
        bgColor,
        borderColor,
        className,
      )}
    >
      <span className={cn('text-xl font-bold', textColor)}>{value}</span>
      <span className={cn('text-[11px]', textColor)}>{label}</span>
    </div>
  )
}
