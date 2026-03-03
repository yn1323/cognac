// SPヘッダー
// モバイル用ヘッダー。メニューアイコン、ロゴ、通知アイコンを配置

import { Menu, Bell, Wine } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SPHeaderProps {
  onMenuClick?: () => void
  onNotificationClick?: () => void
  className?: string
}

export function SPHeader({ onMenuClick, onNotificationClick, className }: SPHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between border-b bg-background px-4 py-3',
        className,
      )}
    >
      <button type="button" onClick={onMenuClick} className="text-foreground">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Wine className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-base font-semibold leading-[1.4] text-foreground">
          Cognac
        </span>
      </div>

      <button type="button" onClick={onNotificationClick} className="text-foreground">
        <Bell className="h-5 w-5" />
      </button>
    </header>
  )
}
