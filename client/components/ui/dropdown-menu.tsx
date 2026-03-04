// 軽量ドロップダウンメニュー
// SP三点リーダーメニューなどに使用

import { useEffect, useRef, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  trigger: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  align?: 'left' | 'right'
}

export function DropdownMenu({
  trigger,
  open,
  onOpenChange,
  children,
  align = 'right',
}: DropdownMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  // クリック外で閉じる
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onOpenChange])

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownMenuItemProps {
  children: ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
  icon?: LucideIcon
  disabled?: boolean
}

export function DropdownMenuItem({
  children,
  onClick,
  variant = 'default',
  icon: Icon,
  disabled,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        variant === 'destructive'
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-muted',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
}
