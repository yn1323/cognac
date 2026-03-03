// タスク作成モーダル
// PC: オーバーレイ + センターモーダル / SP: フルスクリーンシート
// デザイン design.pen PC=wLVYI, SP=qi7HK に準拠

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { X, Upload, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// --- 型定義 ---

type Priority = 'Low' | 'Normal' | 'High' | 'Urgent'

const PC_PRIORITIES: Priority[] = ['Low', 'Normal', 'High', 'Urgent']
const SP_PRIORITIES: Priority[] = ['Low', 'Normal', 'High']

interface FormProps {
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  priority: Priority
  setPriority: (v: Priority) => void
  handleClose: () => void
  handleSubmit: (e: React.FormEvent) => void
}

// --- ラジオボタン ---

function PriorityRadioGroup({
  options,
  value,
  onChange,
}: {
  options: Priority[]
  value: Priority
  onChange: (v: Priority) => void
}) {
  return (
    <div className="flex gap-4">
      {options.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="priority"
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="sr-only"
          />
          {/* ラジオ円 */}
          <div
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-full border bg-primary-foreground',
              value === option ? 'border-blue-600' : 'border-input',
            )}
          >
            {value === option && (
              <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            )}
          </div>
          <span className="text-sm font-medium text-foreground">{option}</span>
        </label>
      ))}
    </div>
  )
}

// --- PC版 ---

function PCTaskModal({
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  handleClose,
  handleSubmit,
}: FormProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/38 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-140 animate-in fade-in zoom-in-95 rounded-xl bg-background shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="relative border-b border-border p-6 pb-5">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold text-foreground">Create New Task</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            新しいタスクを作成して実行キューに追加します
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user authentication"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="タスクの詳細を入力（任意）"
              className="h-25 resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Priority</label>
            <PriorityRadioGroup
              options={PC_PRIORITIES}
              value={priority}
              onChange={setPriority}
            />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Images (optional)</label>
            <div className="flex h-25 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-5 w-5" />
              <p className="text-xs">ドラッグ&ドロップまたはクリックで画像を追加</p>
            </div>
          </div>

          {/* フッターボタン */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
              Create Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- SP版 ---

function SPTaskModal({
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  handleClose,
  handleSubmit,
}: FormProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ヘッダーバー */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">New Task</h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1 text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* スクロールボディ */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-5 overflow-y-auto p-4"
      >
        <p className="text-[13px] text-muted-foreground">
          新しいタスクを作成してキューに追加
        </p>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement user authentication"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="タスクの詳細を入力（任意）"
            className="h-25 resize-none"
          />
        </div>

        {/* Priority (SP: 3択) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Priority</label>
          <PriorityRadioGroup
            options={SP_PRIORITIES}
            value={priority}
            onChange={setPriority}
          />
        </div>

        {/* Images */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Images (optional)</label>
          <div className="flex h-25 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground cursor-pointer">
            <Camera className="h-6 w-6" />
            <p className="text-[13px]">タップして画像を追加</p>
          </div>
        </div>

        {/* スペーサー */}
        <div className="flex-1" />

        {/* フッターボタン */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            Create Task
          </Button>
        </div>
      </form>
    </div>
  )
}

// --- エクスポート ---

export function TaskModal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isOpen = searchParams.get('new-task') === 'true'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('Normal')

  const handleClose = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  // フォームstate リセット（モーダルを開くたびにクリア）
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setPriority('Normal')
    }
  }, [isOpen])

  // bodyスクロールロック
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Escapeキーで閉じる
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log({ title, description, priority })
    handleClose()
  }

  const formProps: FormProps = {
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    handleClose,
    handleSubmit,
  }

  return (
    <>
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCTaskModal {...formProps} />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPTaskModal {...formProps} />
      </div>
    </>
  )
}
