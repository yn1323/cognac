// Gitコミット履歴行
// デザイン design.pen reusable=fkBBE 準拠

import { cn } from '@/lib/utils'
import type { GitCommit } from '@cognac/shared'
import { Badge } from '@/components/ui/badge'

interface GitCommitRowProps {
  commit: GitCommit
  isLast?: boolean
}

export function GitCommitRow({ commit, isLast }: GitCommitRowProps) {
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        !isLast && 'border-b border-[#e5e5e5]',
      )}
    >
      {/* グラフカラム */}
      <div className="flex w-6 flex-col items-center">
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: commit.dotColor }}
        />
        {!isLast && (
          <div
            className="w-0.5 flex-1"
            style={{ backgroundColor: commit.lineColor }}
          />
        )}
      </div>

      {/* 情報カラム */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">
            {commit.message}
          </span>
          {commit.mergeBadge && (
            <Badge variant="outline" className="shrink-0 text-[10px] text-[#7c3aed]">
              {commit.mergeBadge}
            </Badge>
          )}
          {commit.branchBadge && (
            <Badge variant="outline" className="shrink-0 text-[10px] text-[#16a34a]">
              {commit.branchBadge}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-[#1d4ed8]">{commit.hash}</span>
          <span>{commit.date}</span>
          <span>{commit.author}</span>
        </div>
      </div>
    </div>
  )
}
