// タスク詳細タブバー
// PC版: 下線スタイル / SP版: ピルスタイル
// design.pen PC=9d5bz (mObdk), SP=lNPXJ (x7Ikt) に準拠

import { cn } from '@/lib/utils'

const TABS = ['概要', 'ディスカッション', 'プラン', 'CI', 'ログ'] as const

export type Tab = (typeof TABS)[number]

interface DetailTabsProps {
  activeTab: Tab
  onTabChange?: (tab: Tab) => void
  variant?: 'pc' | 'sp'
  className?: string
}

export function DetailTabs({
  activeTab,
  onTabChange,
  variant = 'pc',
  className,
}: DetailTabsProps) {
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
                  ? 'bg-foreground text-background'
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
                ? 'border-foreground text-foreground'
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
