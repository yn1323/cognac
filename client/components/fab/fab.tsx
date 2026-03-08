// Floating Action Button
// モバイルのみ表示。主にタスク追加用

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FabProps {
  icon: LucideIcon
  onClick: () => void
  className?: string
}

export function Fab({ icon: Icon, onClick, className }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-transform active:scale-95 md:hidden',
        className,
      )}
    >
      <Icon className="h-6 w-6" />
    </button>
  )
}
