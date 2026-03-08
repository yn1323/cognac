// SPヘッダー
// モバイル用ヘッダー。ロゴを中央配置

import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/brand-logo'

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
        <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-cognac-dark">
          <BrandLogo size={16} />
        </div>
        <span className="text-base font-semibold leading-[1.4] text-foreground">
          Cognac
        </span>
      </div>
    </header>
  )
}
