// タスク化モーダル — 補足指示を入力してAIでタスク化
// PC版: センターモーダル、SP版: フルスクリーンシート

import { Loader2, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MobileModalFooter } from '@/components/mobile-modal-footer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useEscapeClose, useScrollLock } from '@/hooks/use-scroll-lock'

interface TaskifyModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (userInstruction: string) => void
  isPending: boolean
}

// --- PC版 ---

function PCTaskifyModal({ open, onClose, onSubmit, isPending }: TaskifyModalProps) {
  const [instruction, setInstruction] = useState('')

  useScrollLock(open)
  useEscapeClose(open, onClose)

  // モーダルが閉じたらリセット
  useEffect(() => {
    if (!open) setInstruction('')
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/38 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-140 animate-in fade-in zoom-in-95 rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="relative border-b border-border p-6 pb-5">
          <button
            type="button"
            className="absolute top-5 right-5 cursor-pointer rounded-lg p-1 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold text-foreground">AIでタスク化</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            補足指示を入力すると、AIがその内容を考慮してタスクを作成します
          </p>
        </div>

        {/* ボディ */}
        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">補足指示（任意）</label>
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="例: findingsの1番目だけタスク化して"
              className="h-30 resize-none"
              disabled={isPending}
            />
          </div>

          {/* フッター */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              キャンセル
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => onSubmit(instruction)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-3.5 w-3.5" />
              )}
              AIでタスク化
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- SP版 ---

function SPTaskifyModal({ open, onClose, onSubmit, isPending }: TaskifyModalProps) {
  const [instruction, setInstruction] = useState('')

  useScrollLock(open)
  useEscapeClose(open, onClose)

  // モーダルが閉じたらリセット
  useEffect(() => {
    if (!open) setInstruction('')
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ヘッダーバー */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">AIでタスク化</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ボディ */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <p className="text-[13px] text-muted-foreground">
          補足指示を入力すると、AIがその内容を考慮してタスクを作成します
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">補足指示（任意）</label>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="例: findingsの1番目だけタスク化して"
            className="h-30 resize-none"
            disabled={isPending}
          />
        </div>
      </div>

      {/* フッター */}
      <MobileModalFooter className="px-4">
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-10 flex-1 whitespace-normal px-4 py-2 text-center"
          onClick={onClose}
          disabled={isPending}
        >
          キャンセル
        </Button>
        <Button
          type="button"
          className="h-auto min-h-10 flex-1 whitespace-normal bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
          onClick={() => onSubmit(instruction)}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          AIでタスク化
        </Button>
      </MobileModalFooter>
    </div>
  )
}

// --- レスポンシブ分岐 ---

export function TaskifyModal(props: TaskifyModalProps) {
  if (!props.open) return null

  return (
    <>
      <div className="hidden md:block">
        <PCTaskifyModal {...props} />
      </div>
      <div className="md:hidden">
        <SPTaskifyModal {...props} />
      </div>
    </>
  )
}
