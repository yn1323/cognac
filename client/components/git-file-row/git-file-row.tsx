// Git変更ファイル行
// デザイン design.pen reusable=qMrRv 準拠

import type { GitFileStatus } from '@cognac/shared'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<GitFileStatus, { bg: string; text: string }> = {
  M: { bg: 'bg-[#dbeafe]', text: 'text-[#1d4ed8]' },
  A: { bg: 'bg-[#dcfce7]', text: 'text-[#16a34a]' },
  D: { bg: 'bg-[#fef2f2]', text: 'text-[#ef4444]' },
  '?': { bg: 'bg-neutral-100', text: 'text-neutral-500' },
}

interface GitFileRowProps {
  status: GitFileStatus
  path: string
  isLast?: boolean
  selected?: boolean
  onClick?: () => void
}

export function GitFileRow({ status, path, isLast, selected, onClick }: GitFileRowProps) {
  const style = STATUS_STYLES[status]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2.5 text-left',
        !isLast && 'border-b border-[#e5e5e5]',
        onClick && 'cursor-pointer hover:bg-neutral-50',
        selected && 'border-l-2 border-l-primary bg-primary/5',
      )}
    >
      <div
        className={cn(
          'flex w-7 items-center justify-center rounded py-0.5 text-[11px] font-bold',
          style.bg,
          style.text,
        )}
      >
        {status}
      </div>
      <span className="truncate text-[13px] text-foreground">{path}</span>
    </Tag>
  )
}
