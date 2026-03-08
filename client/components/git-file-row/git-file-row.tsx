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
}

export function GitFileRow({ status, path, isLast }: GitFileRowProps) {
  const style = STATUS_STYLES[status]
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5',
        !isLast && 'border-b border-[#e5e5e5]',
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
      <span className="text-[13px] text-foreground">{path}</span>
    </div>
  )
}
