// SPヘッダー
// モバイル用ヘッダー。ロゴを中央配置

import { BrandLogo } from '@/components/brand-logo'
import { useSettings } from '@/hooks/use-system'
import { providerLabel } from '@/lib/provider'
import { cn } from '@/lib/utils'

interface SPHeaderProps {
  className?: string
}

export function SPHeader({ className }: SPHeaderProps) {
  const { data: settings } = useSettings()
  const provider = settings?.provider ?? 'claude'
  return (
    <header
      className={cn('flex items-center justify-center border-b bg-background px-4 py-3', className)}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-cognac-dark">
          <BrandLogo size={16} />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-semibold leading-[1.4] text-foreground">Cognac</span>
          <span className="text-xs text-muted-foreground">· {providerLabel(provider)}</span>
        </div>
      </div>
    </header>
  )
}
