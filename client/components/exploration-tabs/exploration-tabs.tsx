// 探索詳細タブバー
// PC版: 下線スタイル / SP版: ピルスタイル
// DetailTabsと同じパターン、タブ名のみ探索用に変更

import { cn } from '@/lib/utils'

const TABS = ['概要', 'ディスカッション', 'ログ', 'レポート'] as const

export type ExplorationTab = (typeof TABS)[number]

interface ExplorationTabsProps {
  activeTab: ExplorationTab
  onTabChange?: (tab: ExplorationTab) => void
  variant?: 'pc' | 'sp'
  className?: string
}

export function ExplorationTabs({
  activeTab,
  onTabChange,
  variant = 'pc',
  className,
}: ExplorationTabsProps) {
  if (variant === 'sp') {
    return (
      <div className={cn('flex gap-1', className)}>
        {TABS.map((tab) => {
          const isActive = tab === activeTab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange?.(tab)}
              className={cn(
                'cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('flex gap-1', className)}>
      {TABS.map((tab) => {
        const isActive = tab === activeTab
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange?.(tab)}
            className={cn(
              'cursor-pointer border-b-2 px-3 pb-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
