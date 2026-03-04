// タスク編集モーダル
// PC: オーバーレイ + センターモーダル / SP: フルスクリーンシート
// task-modalのパターンを流用

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { Task, PriorityLabel } from '@cognac/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PriorityRadioGroup } from '@/components/ui/priority-radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateTask } from '@/hooks/use-tasks'
import { PRIORITY_MAP, PRIORITY_REVERSE, PC_PRIORITIES, SP_PRIORITIES } from '@/lib/constants'

// --- 型定義 ---

interface EditTaskModalProps {
  task: Task
  open: boolean
  onClose: () => void
}

interface FormProps {
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  priority: PriorityLabel
  setPriority: (v: PriorityLabel) => void
  onClose: () => void
  handleSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}

// --- PC版 ---

function PCEditModal({
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  onClose,
  handleSubmit,
  isSubmitting,
}: FormProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/38 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-140 animate-in fade-in zoom-in-95 rounded-xl bg-background shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="relative border-b border-border p-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold text-foreground">Edit Task</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            タスクの内容を編集します
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user authentication"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="タスクの詳細を入力（任意）"
              className="h-25 resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Priority</label>
            <PriorityRadioGroup
              options={PC_PRIORITIES}
              value={priority}
              onChange={setPriority}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- SP版 ---

function SPEditModal({
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  onClose,
  handleSubmit,
  isSubmitting,
}: FormProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">Edit Task</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-5 overflow-y-auto p-4"
      >
        <p className="text-[13px] text-muted-foreground">
          タスクの内容を編集します
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement user authentication"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="タスクの詳細を入力（任意）"
            className="h-25 resize-none"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Priority</label>
          <PriorityRadioGroup
            options={SP_PRIORITIES}
            value={priority}
            onChange={setPriority}
          />
        </div>

        <div className="flex-1" />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// --- エクスポート ---

export function EditTaskModal({ task, open, onClose }: EditTaskModalProps) {
  const updateTask = useUpdateTask()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<PriorityLabel>('Normal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // モーダルが開くたびにtaskの値でリセット
  useEffect(() => {
    if (open) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setPriority(PRIORITY_REVERSE[task.priority] ?? 'Normal')
      setIsSubmitting(false)
    }
  }, [open, task])

  // bodyスクロールロック
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  // Escapeキーで閉じる
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: {
          title,
          description: description || undefined,
          priority: PRIORITY_MAP[priority],
        },
      })
      onClose()
    } catch (err) {
      console.error('タスク更新に失敗:', err)
      setIsSubmitting(false)
    }
  }

  const formProps: FormProps = {
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    onClose,
    handleSubmit,
    isSubmitting,
  }

  return (
    <>
      <div className="hidden md:block">
        <PCEditModal {...formProps} />
      </div>
      <div className="md:hidden">
        <SPEditModal {...formProps} />
      </div>
    </>
  )
}
