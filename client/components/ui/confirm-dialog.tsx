// 確認ダイアログ
// デザインシステム: UgIg0 (Confirm Dialog)

import { useEffect, useId, useCallback } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollLock } from '@/hooks/use-scroll-lock'

interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = '削除する',
  cancelLabel = 'キャンセル',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const titleId = useId()

  const handleEscape = useCallback(() => {
    if (!isLoading) onCancel()
  }, [isLoading, onCancel])

  useScrollLock(open)

  // Escapeキーで閉じる（ローディング中は無効）
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleEscape()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, handleEscape])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="absolute inset-0 bg-black/38"
        onClick={isLoading ? undefined : onCancel}
      />

      {/* ダイアログ本体 — UgIg0 準拠: w-[400px], rounded-lg, border, shadow */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-4 w-full max-w-[400px] rounded-lg border border-border bg-card shadow-[0_20px_20px_#0000001a,0_10px_10px_#0000000a]"
      >
        {/* Header — padding:24, gap:12 */}
        <div className="flex flex-col gap-3 p-6">
          {/* アイコン + タイトル行 — gap:12 */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
              <TriangleAlert className="h-5 w-5 text-destructive" />
            </div>
            <h2
              id={titleId}
              className="text-lg font-semibold leading-[1.4] text-foreground"
            >
              {title}
            </h2>
          </div>
          {description && (
            <p className="text-sm leading-[1.43] text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {/* Actions — justify:end, gap:8, padding:[16,24,24,24] */}
        <div className="flex justify-end gap-2 px-6 pb-6 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
