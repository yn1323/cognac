// SPヘッダー
// モバイル用ヘッダー。ロゴを中央配置

import { Wine } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SPHeaderProps {
  className?: string
}

export function SPHeader({ className }: SPHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-center border-b bg-background px-4 py-3',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-blue-500">
          <Wine className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-base font-semibold leading-[1.4] text-foreground">
          Cognac
        </span>
      </div>
    </header>
  )
}
