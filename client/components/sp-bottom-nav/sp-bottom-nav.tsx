// SP下部ナビゲーション
// モバイル下部のタブバー。SPNavItemを並べて使う

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SPNavItemProps {
  icon: LucideIcon
  label: string
  active?: boolean
  onClick?: () => void
}

export function SPNavItem({ icon: Icon, label, active, onClick }: SPNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-1"
    >
      <Icon
        className={cn(
          'h-5 w-5',
          active ? 'text-primary' : 'text-muted-foreground',
        )}
      />
      <span
        className={cn(
          'text-[10px]',
          active
            ? 'font-semibold text-primary'
            : 'font-medium text-muted-foreground',
        )}
      >
        {label}
      </span>
    </button>
  )
}

interface SPBottomNavProps {
  children: ReactNode
  className?: string
}

export function SPBottomNav({ children, className }: SPBottomNavProps) {
  return (
    <nav
      className={cn(
        'flex items-center justify-around border-t bg-background py-2.5',
        className,
      )}
    >
      {children}
    </nav>
  )
}
