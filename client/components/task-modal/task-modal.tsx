// タスク作成モーダル
// PC: オーバーレイ + センターモーダル / SP: フルスクリーンシート
// デザイン design.pen PC=wLVYI, SP=qi7HK に準拠

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { X, Upload, Camera, Loader2 } from 'lucide-react'
import type { PriorityLabel } from '@cognac/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PriorityRadioGroup } from '@/components/ui/priority-radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTask, useUploadTaskImages } from '@/hooks/use-tasks'
import { PRIORITY_MAP, PC_PRIORITIES, SP_PRIORITIES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface FormProps {
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  priority: PriorityLabel
  setPriority: (v: PriorityLabel) => void
  files: File[]
  onFilesAdd: (newFiles: File[]) => void
  onFileRemove: (index: number) => void
  handleClose: () => void
  handleSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}

// --- 画像プレビュー ---

function ImagePreviewList({
  files,
  onRemove,
}: {
  files: File[]
  onRemove: (index: number) => void
}) {
  // blob URLをメモ化して、files変更時のみ再生成 + クリーンアップでリーク防止
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => {
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [urls])

  if (files.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {files.map((file, i) => (
        <div key={`${file.name}-${i}`} className="relative group">
          <img
            src={urls[i]}
            alt={file.name}
            className="h-16 w-16 rounded-md object-cover border border-border"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

// --- ドロップゾーン ---

function DropZone({
  onFilesAdd,
  icon: Icon,
  text,
  className,
}: {
  onFilesAdd: (files: File[]) => void
  icon: typeof Upload
  text: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (droppedFiles.length > 0) onFilesAdd(droppedFiles)
    },
    [onFilesAdd],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files
      if (selected && selected.length > 0) {
        onFilesAdd(Array.from(selected))
      }
      // 同じファイルを再選択できるようにリセット
      e.target.value = ''
    },
    [onFilesAdd],
  )

  return (
    <>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex h-25 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed cursor-pointer transition-colors',
          isDragOver
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-border bg-muted/30 hover:bg-muted/50',
          className,
        )}
      >
        <Icon className={cn('h-5 w-5', isDragOver ? 'text-blue-500' : 'text-muted-foreground')} />
        <p className={cn('text-xs', isDragOver ? 'text-blue-500' : 'text-muted-foreground')}>
          {text}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputChange}
        className="sr-only"
      />
    </>
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
  files,
  onFilesAdd,
  onFileRemove,
  handleClose,
  handleSubmit,
  isSubmitting,
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
            <DropZone
              onFilesAdd={onFilesAdd}
              icon={Upload}
              text="ドラッグ&ドロップまたはクリックで画像を追加"
            />
            <ImagePreviewList files={files} onRemove={onFileRemove} />
          </div>

          {/* フッターボタン */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
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
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
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
  files,
  onFilesAdd,
  onFileRemove,
  handleClose,
  handleSubmit,
  isSubmitting,
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
          <DropZone
            onFilesAdd={onFilesAdd}
            icon={Camera}
            text="タップして画像を追加"
            className="border-solid"
          />
          <ImagePreviewList files={files} onRemove={onFileRemove} />
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
                Creating...
              </>
            ) : (
              'Create Task'
            )}
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

  const createTask = useCreateTask()
  const uploadImages = useUploadTaskImages()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<PriorityLabel>('Normal')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  // フォームstate リセット（モーダルを開くたびにクリア）
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setPriority('Normal')
      setFiles([])
      setIsSubmitting(false)
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

  const onFilesAdd = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5))
  }

  const onFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 1. タスク作成
      const task = await createTask.mutateAsync({
        title,
        description: description || undefined,
        priority: PRIORITY_MAP[priority],
      })

      // 2. 画像があればアップロード
      if (files.length > 0) {
        await uploadImages.mutateAsync({ taskId: task.id, files })
      }

      handleClose()
    } catch (err) {
      console.error('タスク作成に失敗:', err)
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
    files,
    onFilesAdd,
    onFileRemove,
    handleClose,
    handleSubmit,
    isSubmitting,
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
