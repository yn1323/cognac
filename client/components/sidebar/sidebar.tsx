// PCサイドバー
// ブランドロゴ + ナビゲーションを表示する

import type { LucideIcon } from 'lucide-react'
import {
  ListChecks,
  Compass,
  GitBranch,
  Terminal,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/brand-logo'
import { useSettings } from '@/hooks/use-system'
import { providerLabel } from '@/lib/provider'

interface NavItem {
  icon: LucideIcon
  label: string
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { icon: ListChecks, label: 'タスク' },
  { icon: Compass, label: '探索' },
  { icon: GitBranch, label: 'Git' },
  { icon: Terminal, label: 'コンソール' },
]

const FOOTER_NAV_ITEM: NavItem = { icon: Settings, label: '設定' }

interface SidebarProps {
  activeItem?: string
  onItemClick?: (label: string) => void
  className?: string
}

export function Sidebar({ activeItem = 'タスク', onItemClick, className }: SidebarProps) {
  const { data: settings } = useSettings()
  const provider = settings?.provider ?? 'claude'
  const renderNavButton = (item: NavItem) => {
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
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </button>
    )
  }

  return (
    <aside
      className={cn(
        'flex w-64 min-h-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar p-2',
        className,
      )}
    >
      {/* ヘッダー: ブランドロゴ */}
      <header className="shrink-0">
        <div className="flex items-center justify-between rounded-md p-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-cognac-dark">
              <BrandLogo size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-[1.4] text-sidebar-foreground">
                Cognac
              </span>
              <span className="text-xs leading-tight text-sidebar-foreground/60">
                {providerLabel(provider)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="sidebar-body mt-2 flex min-h-0 flex-1 flex-col">
        {/* 通常ナビだけをスクロール対象にする */}
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
          {PRIMARY_NAV_ITEMS.map(renderNavButton)}
        </nav>
      </div>

      <footer className="sidebar-footer mt-2 shrink-0 border-t border-sidebar-border pt-2">
        <nav className="flex flex-col gap-0.5">
          {renderNavButton(FOOTER_NAV_ITEM)}
        </nav>
      </footer>
    </aside>
  )
}
