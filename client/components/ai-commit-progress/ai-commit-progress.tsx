// AIコミット進捗 — ヘッダー + ターミナルログ表示
// デザイン: スクリーンショット準拠

import { Loader2 } from 'lucide-react'

interface LogLine {
  text?: string
  bold?: boolean
  blank?: boolean
}

interface AiCommitProgressProps {
  logLines: LogLine[]
}

export function AiCommitProgress({ logLines }: AiCommitProgressProps) {
  return (
    <div className="flex flex-col">
      {/* Header: タイトル + 実行中バッジ + スピナー */}
      <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">AIコミット</span>
          <span className="rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-xs font-medium text-[#16a34a]">
            実行中
          </span>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>

      {/* ターミナルログ */}
      <div className="flex flex-col gap-0.5 px-4 py-4">
        {logLines.map((line, i) =>
          line.blank ? (
            <div key={i} className="h-4" />
          ) : (
            <span
              key={i}
              className={`font-mono text-xs leading-relaxed text-foreground ${line.bold ? 'font-medium' : ''}`}
            >
              {line.text}
            </span>
          ),
        )}
      </div>
    </div>
  )
}
