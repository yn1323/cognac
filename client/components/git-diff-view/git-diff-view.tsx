// Git diff 表示コンポーネント
// unified diff をパースして行ごとに表示する

import { FileText, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type DiffLineType = 'hunk' | 'addition' | 'deletion' | 'context'
type GitDiffTheme = 'default' | 'soft'

interface ParsedLine {
  type: DiffLineType
  content: string
  oldNum: number | null
  newNum: number | null
}

function parseDiffLines(diff: string): ParsedLine[] {
  const rawLines = diff.split('\n')
  const lines: ParsedLine[] = []
  let oldNum = 0
  let newNum = 0

  for (const raw of rawLines) {
    // ヘッダー行（diff --git, index, ---, +++）はスキップ
    if (
      raw.startsWith('diff --git') ||
      raw.startsWith('index ') ||
      raw.startsWith('--- ') ||
      raw.startsWith('+++ ')
    ) {
      continue
    }

    if (raw.startsWith('@@')) {
      // ハンクヘッダーから開始行を抽出
      const match = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (match) {
        oldNum = Number.parseInt(match[1], 10)
        newNum = Number.parseInt(match[2], 10)
      }
      lines.push({ type: 'hunk', content: raw, oldNum: null, newNum: null })
    } else if (raw.startsWith('+')) {
      lines.push({ type: 'addition', content: raw.slice(1), oldNum: null, newNum: newNum })
      newNum++
    } else if (raw.startsWith('-')) {
      lines.push({ type: 'deletion', content: raw.slice(1), oldNum: oldNum, newNum: null })
      oldNum++
    } else {
      // コンテキスト行（空白スペース or 通常行）
      const content = raw.startsWith(' ') ? raw.slice(1) : raw
      lines.push({ type: 'context', content, oldNum: oldNum, newNum: newNum })
      oldNum++
      newNum++
    }
  }

  return lines
}

const LINE_STYLES: Record<DiffLineType, string> = {
  hunk: 'bg-diff-neutral-hunk-bg text-diff-neutral-hunk-text',
  addition: 'bg-diff-added-bg text-diff-added-text hover:bg-diff-added-hover-bg',
  deletion: 'bg-diff-removed-bg text-diff-removed-text hover:bg-diff-removed-hover-bg',
  context: 'bg-diff-neutral-bg text-diff-neutral-text hover:bg-diff-neutral-hover-bg',
}

const BORDER_STYLES: Record<Exclude<DiffLineType, 'hunk'>, string> = {
  addition: 'border-l border-diff-added-border',
  deletion: 'border-l border-diff-removed-border',
  context: 'border-l border-diff-neutral-border',
}

const LINE_NUMBER_STYLES: Record<Exclude<DiffLineType, 'hunk'>, string> = {
  addition: 'text-diff-added-line-number',
  deletion: 'text-diff-removed-line-number',
  context: 'text-diff-neutral-line-number',
}

const BADGE_STYLES: Record<'addition' | 'deletion', string> = {
  addition:
    'mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-diff-added-badge-bg text-[10px] font-bold leading-none text-diff-added-badge-text',
  deletion:
    'mr-2 inline-flex h-4 w-4 items-center justify-center rounded-sm bg-diff-removed-badge-bg text-[10px] font-bold leading-none text-diff-removed-badge-text',
}

interface GitDiffViewProps {
  path: string
  diff: string | null
  isLoading: boolean
  onClose: () => void
  theme?: GitDiffTheme
}

export function GitDiffView({
  path,
  diff,
  isLoading,
  onClose,
  theme = 'default',
}: GitDiffViewProps) {
  const lines = diff ? parseDiffLines(diff) : []

  return (
    <div
      data-theme={theme}
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm',
        theme === 'soft' && [
          '[--diff-theme-soft:1]',
          '[--diff-added-bg:var(--diff-soft-added-bg)]',
          '[--diff-added-hover-bg:var(--diff-soft-added-hover-bg)]',
          '[--diff-added-text:var(--diff-soft-added-text)]',
          '[--diff-added-border:var(--diff-soft-added-border)]',
          '[--diff-added-line-number:var(--diff-soft-added-line-number)]',
          '[--diff-added-badge-bg:var(--diff-soft-added-badge-bg)]',
          '[--diff-added-badge-text:var(--diff-soft-added-badge-text)]',
          '[--diff-removed-bg:var(--diff-soft-removed-bg)]',
          '[--diff-removed-hover-bg:var(--diff-soft-removed-hover-bg)]',
          '[--diff-removed-text:var(--diff-soft-removed-text)]',
          '[--diff-removed-border:var(--diff-soft-removed-border)]',
          '[--diff-removed-line-number:var(--diff-soft-removed-line-number)]',
          '[--diff-removed-badge-bg:var(--diff-soft-removed-badge-bg)]',
          '[--diff-removed-badge-text:var(--diff-soft-removed-badge-text)]',
          '[--diff-neutral-bg:var(--diff-soft-neutral-bg)]',
          '[--diff-neutral-hover-bg:var(--diff-soft-neutral-hover-bg)]',
          '[--diff-neutral-text:var(--diff-soft-neutral-text)]',
          '[--diff-neutral-border:var(--diff-soft-neutral-border)]',
          '[--diff-neutral-line-number:var(--diff-soft-neutral-line-number)]',
          '[--diff-neutral-badge-bg:var(--diff-soft-neutral-badge-bg)]',
          '[--diff-neutral-badge-text:var(--diff-soft-neutral-badge-text)]',
          '[--diff-neutral-hunk-bg:var(--diff-soft-neutral-hunk-bg)]',
          '[--diff-neutral-hunk-text:var(--diff-soft-neutral-hunk-text)]',
        ],
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-semibold text-foreground">{path}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !diff ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            差分はないよ
          </div>
        ) : (
          <table className="w-full border-collapse font-mono text-[13px] leading-6">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} data-line-type={line.type} className={cn(LINE_STYLES[line.type])}>
                  {line.type === 'hunk' ? (
                    <td colSpan={3} className="px-3 py-1.5 text-xs">
                      {line.content}
                    </td>
                  ) : (
                    <>
                      <td
                        className={cn(
                          'w-[1px] whitespace-nowrap border-r border-diff-neutral-border px-2 py-0.5 text-right select-none',
                          BORDER_STYLES[line.type],
                          LINE_NUMBER_STYLES[line.type],
                        )}
                      >
                        {line.oldNum ?? ''}
                      </td>
                      <td
                        className={cn(
                          'w-[1px] whitespace-nowrap border-r border-diff-neutral-border px-2 py-0.5 text-right select-none',
                          LINE_NUMBER_STYLES[line.type],
                        )}
                      >
                        {line.newNum ?? ''}
                      </td>
                      <td className="whitespace-pre px-3 py-0.5">
                        {line.type === 'addition' && (
                          <span className={cn('select-none', BADGE_STYLES.addition)}>+</span>
                        )}
                        {line.type === 'deletion' && (
                          <span className={cn('select-none', BADGE_STYLES.deletion)}>-</span>
                        )}
                        {line.type === 'context' && (
                          <span className="mr-2 inline-flex h-4 w-4 select-none items-center justify-center rounded-sm bg-diff-neutral-badge-bg text-[10px] font-bold leading-none text-diff-neutral-badge-text">
                            ·
                          </span>
                        )}
                        {line.content}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
