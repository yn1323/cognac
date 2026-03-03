// PCサイドバー
// ブランドロゴ + ナビゲーションを表示する

import type { LucideIcon } from 'lucide-react'
import {
  Wine,
  LayoutDashboard,
  ListChecks,
  Terminal,
  Settings,
  PanelLeftClose,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: LucideIcon
  label: string
  active?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { icon: ListChecks, label: 'Tasks', active: true },
  { icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  activeItem?: string
  className?: string
}

export function Sidebar({ activeItem = 'Tasks', className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex w-64 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-2',
        className,
      )}
    >
      {/* ヘッダー: ブランドロゴ + 折りたたみアイコン */}
      <div className="flex items-center justify-between rounded-md p-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-sidebar-primary">
            <Wine className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-[1.4] text-sidebar-foreground">
              Cognac
            </span>
          </div>
        </div>
        <button type="button" className="text-muted-foreground">
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* ナビゲーション */}
      <nav className="flex flex-1 flex-col gap-0.5">
        <span className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Navigation
        </span>
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === activeItem
          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
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
