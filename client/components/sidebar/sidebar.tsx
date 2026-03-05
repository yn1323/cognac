// PCサイドバー
// ブランドロゴ + ナビゲーションを表示する

import type { LucideIcon } from 'lucide-react'
import {
  ListChecks,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/brand-logo'

interface NavItem {
  icon: LucideIcon
  label: string
  active?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { icon: ListChecks, label: 'タスク', active: true },
  { icon: Settings, label: '設定' },
]

interface SidebarProps {
  activeItem?: string
  onItemClick?: (label: string) => void
  className?: string
}

export function Sidebar({ activeItem = 'タスク', onItemClick, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex w-64 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-2',
        className,
      )}
    >
      {/* ヘッダー: ブランドロゴ */}
      <div className="flex items-center justify-between rounded-md p-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-cognac-dark">
            <BrandLogo size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-[1.4] text-sidebar-foreground">
              Cognac
            </span>
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === activeItem
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onItemClick?.(item.label)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
