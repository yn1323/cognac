// SPタブ
// モバイル用の横並びタブ。アクティブ状態で下線がつく

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SPTabProps {
  label: string
  active?: boolean
  onClick?: () => void
}

export function SPTab({ label, active, onClick }: SPTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-2 text-[13px]',
        active
          ? 'border-b-2 border-primary font-semibold text-foreground'
          : 'font-medium text-muted-foreground',
      )}
    >
      {label}
    </button>
  )
}

interface SPTabBarProps {
  children: ReactNode
  className?: string
}

export function SPTabBar({ children, className }: SPTabBarProps) {
  return (
    <div className={cn('flex px-4', className)}>
      {children}
    </div>
  )
}
