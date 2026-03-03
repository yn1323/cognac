// メトリクスカード
// ダッシュボードでKPI表示するときに使うカード

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  className?: string
}

export function MetricCard({ label, value, icon: Icon, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium leading-[1.3] text-muted-foreground">
            {label}
          </span>
          <span className="text-[28px] font-bold leading-[1.2] text-foreground">
            {value}
          </span>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  )
}
