// SP詳細ヘッダー
// モバイル詳細ページ用。戻るボタン + タイトル + タブバー

import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SPDetailHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  children?: ReactNode
  className?: string
}

export function SPDetailHeader({
  title,
  subtitle,
  onBack,
  children,
  className,
}: SPDetailHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col border-b bg-background',
        className,
      )}
    >
      {/* 上段: 戻る + タイトル */}
      <div className="flex items-center gap-3 px-4 py-3">
        {onBack && (
          <button type="button" onClick={onBack} className="text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold leading-[1.3] text-foreground">
            {title}
          </span>
          {subtitle && (
            <span className="text-xs leading-[1.4] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* 下段: タブバースロット */}
      {children && (
        <div className="flex px-4">
          {children}
        </div>
      )}
    </div>
  )
}
