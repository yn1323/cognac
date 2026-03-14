// Gitコミット履歴行
// デザイン design.pen reusable=fkBBE 準拠

import type { GitCommit } from '@cognac/shared'
import { Bot, MoreVertical, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface GitCommitRowProps {
  commit: GitCommit
  isLast?: boolean
  onExplain?: () => void
  onRevert?: () => void
}

export function GitCommitRow({ commit, isLast, onExplain, onRevert }: GitCommitRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={cn('flex gap-3 px-4 py-3', !isLast && 'border-b border-[#e5e5e5]')}>
      {/* グラフカラム */}
      <div className="flex w-6 flex-col items-center">
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: commit.dotColor }}
        />
        {!isLast && <div className="w-0.5 flex-1" style={{ backgroundColor: commit.lineColor }} />}
      </div>

      {/* 情報カラム */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">{commit.message}</span>
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
          {(onExplain || onRevert) && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {onExplain && (
                <button
                  type="button"
                  onClick={onExplain}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-[#2563eb] hover:bg-[#eff6ff]"
                >
                  <Bot className="h-3 w-3" />
                  AI 解説
                </button>
              )}
              {onRevert && (
                <DropdownMenu
                  trigger={
                    <button
                      type="button"
                      className="flex items-center justify-center rounded p-0.5 text-muted-foreground hover:bg-neutral-100"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  }
                  open={menuOpen}
                  onOpenChange={setMenuOpen}
                >
                  <DropdownMenuItem
                    icon={Undo2}
                    variant="destructive"
                    onClick={() => {
                      onRevert()
                      setMenuOpen(false)
                    }}
                  >
                    リバート
                  </DropdownMenuItem>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
