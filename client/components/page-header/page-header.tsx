// ページヘッダー
// タイトル + サブタイトル + アクション領域を持つ汎用ヘッダー

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold leading-[1.3] text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm leading-[1.4] text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  )
}
