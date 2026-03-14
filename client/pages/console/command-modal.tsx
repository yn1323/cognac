// コマンド登録/編集モーダル
// デザイン ConsolePage.pen qZfZ7 に準拠

import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useEscapeClose, useScrollLock } from '@/hooks/use-scroll-lock'

interface CommandModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { name: string; command: string; note: string }) => void
  initialData?: { name: string; command: string; note: string }
}

export function CommandModal({ open, onClose, onSubmit, initialData }: CommandModalProps) {
  const titleId = useId()
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [note, setNote] = useState('')

  const isEdit = !!initialData

  useScrollLock(open)
  useEscapeClose(open, onClose)

  // 開閉時にフォームをリセット/初期化
  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? '')
      setCommand(initialData?.command ?? '')
      setNote(initialData?.note ?? '')
    }
  }, [open, initialData])

  if (!open) return null

  const canSubmit = name.trim() !== '' && command.trim() !== ''

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({ name: name.trim(), command: command.trim(), note: note.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-black/38" onClick={onClose} />

      {/* モーダル本体 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-4 w-full max-w-[480px] rounded-lg border border-border bg-card shadow-[0_20px_20px_#0000001a,0_10px_10px_#0000000a]"
      >
        {/* Header */}
        <div className="flex flex-col gap-1 p-6 pb-0">
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            {isEdit ? 'コマンドを編集' : 'コマンドを登録'}
          </h2>
          <p className="text-sm text-muted-foreground">
            実行するコマンドの情報を入力してください。
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cmd-name" className="text-sm font-medium text-foreground">
              表示名
            </label>
            <Input
              id="cmd-name"
              placeholder="例: Dev Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cmd-command" className="text-sm font-medium text-foreground">
              コマンド
            </label>
            <Input
              id="cmd-command"
              placeholder="例: pnpm dev"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cmd-note" className="text-sm font-medium text-foreground">
              メモ（任意）
            </label>
            <Textarea
              id="cmd-note"
              placeholder="コマンドの説明など"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {isEdit ? '更新' : '登録'}
          </Button>
        </div>
      </div>
    </div>
  )
}
