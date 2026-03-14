// コミットAI解説モーダル
// 既存MergeModalのパターンに準拠

import { AlertCircle, Bot, Loader2, X } from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { Button } from '@/components/ui/button'
import { useEscapeClose, useScrollLock } from '@/hooks/use-scroll-lock'

interface CommitExplainModalProps {
  open: boolean
  onClose: () => void
  commitHash: string
  commitMessage: string
  explanation: string | null
  isLoading: boolean
  isError?: boolean
}

export function CommitExplainModal({
  open,
  onClose,
  commitHash,
  commitMessage,
  explanation,
  isLoading,
  isError,
}: CommitExplainModalProps) {
  useScrollLock(open)
  useEscapeClose(open, onClose)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-black/38" onClick={onClose} />

      {/* モーダル本体 */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative mx-4 w-full max-w-[520px] rounded-lg border border-[#e5e5e5] bg-white shadow-[0_20px_20px_#0000001a,0_10px_10px_#0000000a]"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eff6ff]">
              <Bot className="h-5 w-5 text-[#2563eb]" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="text-lg font-semibold text-foreground">AI コミット解説</h2>
              <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 font-medium text-[#1d4ed8]">{commitHash}</span>
                <span className="truncate">{commitMessage}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#2563eb]" />
              <span className="text-sm text-muted-foreground">AIが変更内容を解析中...</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle className="h-6 w-6 text-[#e7000b]" />
              <span className="text-sm text-muted-foreground">解説の生成に失敗しました</span>
            </div>
          ) : (
            <div className="rounded-md border border-[#e5e5e5] bg-[#fafafa] p-4">
              <MarkdownRenderer content={explanation ?? ''} variant="inline" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 pb-6">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  )
}
