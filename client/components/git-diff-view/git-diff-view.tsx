// Git diff 表示コンポーネント
// unified diff をパースして色付きで表示する

import { X, Loader2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

type DiffLineType = 'hunk' | 'addition' | 'deletion' | 'context'

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
      // ハンクヘッダーから行番号を抽出
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
      // コンテキスト行（先頭スペース or 空行）
      const content = raw.startsWith(' ') ? raw.slice(1) : raw
      lines.push({ type: 'context', content, oldNum: oldNum, newNum: newNum })
      oldNum++
      newNum++
    }
  }

  return lines
}

const LINE_STYLES: Record<DiffLineType, string> = {
  hunk: 'bg-muted text-muted-foreground',
  addition: 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300',
  deletion: 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300',
  context: '',
}

interface GitDiffViewProps {
  path: string
  diff: string | null
  isLoading: boolean
  onClose: () => void
}

export function GitDiffView({ path, diff, isLoading, onClose }: GitDiffViewProps) {
  const lines = diff ? parseDiffLines(diff) : []

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-[#e5e5e5] bg-[#fafafa] shadow-[0_1px_1.75px_#0000000d]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-semibold text-foreground">{path}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 shrink-0 rounded p-1 text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
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
            差分なし
          </div>
        ) : (
          <table className="w-full border-collapse font-mono text-[13px] leading-6">
            <tbody>
              {lines.map((line, i) => (
                <tr
                  key={i}
                  className={cn(LINE_STYLES[line.type])}
                >
                  {line.type === 'hunk' ? (
                    <td colSpan={3} className="px-3 py-1.5 text-xs">
                      {line.content}
                    </td>
                  ) : (
                    <>
                      <td className="w-[1px] whitespace-nowrap border-r border-[#e5e5e5] px-2 py-0.5 text-right text-muted-foreground/60 select-none">
                        {line.oldNum ?? ''}
                      </td>
                      <td className="w-[1px] whitespace-nowrap border-r border-[#e5e5e5] px-2 py-0.5 text-right text-muted-foreground/60 select-none">
                        {line.newNum ?? ''}
                      </td>
                      <td className="whitespace-pre px-3 py-0.5">
                        {line.type === 'addition' && <span className="select-none text-green-500">+</span>}
                        {line.type === 'deletion' && <span className="select-none text-red-500">-</span>}
                        {line.type === 'context' && <span className="select-none"> </span>}
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
