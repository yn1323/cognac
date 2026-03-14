// 変更ファイル一覧パネル
// Git画面のPC版・SP版で共有する

import type { GitFile } from '@cognac/shared'
import { Bot, Trash2 } from 'lucide-react'
import { AiCommitProgress } from '@/components/ai-commit-progress'
import { GitFileRow } from '@/components/git-file-row'
import { Button } from '@/components/ui/button'

// AIコミット実行中に表示するプレースホルダーログ
const COMMIT_IN_PROGRESS_LOG = [
  { text: 'AIコミットを実行中...', bold: true },
  { text: '' },
  { text: '$ git add -A' },
  { text: '$ git diff --staged' },
  { text: 'analyzing changes...' },
  { text: 'generating commit message...' },
]

interface ChangedFilesPanelProps {
  isCommitting: boolean
  files: GitFile[]
  selectedFilePath: string | null
  onFileSelect: (path: string) => void
  onStartCommit: () => void
  onExplainWorking: () => void
  isExplainWorkingLoading: boolean
  onToggleDiscardDialog: () => void
  commitDisabled: boolean
}

export function ChangedFilesPanel({
  isCommitting,
  files,
  selectedFilePath,
  onFileSelect,
  onStartCommit,
  onExplainWorking,
  isExplainWorkingLoading,
  onToggleDiscardDialog,
  commitDisabled,
}: ChangedFilesPanelProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#e5e5e5] bg-[#fafafa] shadow-[0_1px_1.75px_#0000000d]">
      {isCommitting ? (
        <AiCommitProgress logLines={COMMIT_IN_PROGRESS_LOG} />
      ) : (
        <>
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">変更ファイル</span>
              <span className="text-sm text-muted-foreground">({files.length})</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-[#e7000b]"
              onClick={onToggleDiscardDialog}
              disabled={files.length === 0}
            >
              <Trash2 className="h-4 w-4 text-[#e7000b]" />
              全て破棄
            </Button>
          </div>

          {/* ファイルリスト */}
          <div className="flex flex-col">
            {files.map((file, i) => (
              <GitFileRow
                key={file.path}
                status={file.status}
                path={file.path}
                isLast={i === files.length - 1}
                selected={file.path === selectedFilePath}
                onClick={() => onFileSelect(file.path)}
              />
            ))}
          </div>

          {/* AIコミット・解説ボタン */}
          <div className="flex gap-2 p-4">
            <Button
              variant="primary"
              className="flex-1"
              onClick={onStartCommit}
              disabled={files.length === 0 || commitDisabled}
            >
              <Bot className="h-4 w-4" />
              AI コミット
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onExplainWorking}
              disabled={files.length === 0 || isExplainWorkingLoading}
            >
              <Bot className="h-4 w-4" />
              AI 解説
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
