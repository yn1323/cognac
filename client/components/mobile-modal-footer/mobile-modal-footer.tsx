// SPフルスクリーンモーダルの共通フッターレイアウト

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileModalFooterProps {
  children: ReactNode
  className?: string
}

export function MobileModalFooter({ children, className }: MobileModalFooterProps) {
  return (
    <div
      className={cn(
        'mt-auto flex gap-3 pt-4 pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
