// タスク編集モーダル
// PC: オーバーレイ + センターモーダル / SP: フルスクリーンシート
// task-modalのパターンを流用

import { useState, useEffect } from 'react'
import { X, Upload, Camera, Loader2 } from 'lucide-react'
import type { Task, TaskImage, PriorityLabel } from '@cognac/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropZone } from '@/components/ui/drop-zone'
import { PriorityRadioGroup } from '@/components/ui/priority-radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/toast'
import { useUpdateTask, useTaskImages, useUploadTaskImages, useDeleteTaskImage } from '@/hooks/use-tasks'
import { PRIORITY_MAP, PRIORITY_REVERSE, PC_PRIORITIES, SP_PRIORITIES } from '@/lib/constants'
import { validateTitle } from '@/lib/validation'

// --- 型定義 ---

interface EditTaskModalProps {
  task: Task
  open: boolean
  onClose: () => void
}

interface FormProps {
  title: string
  setTitle: (v: string) => void
  titleError: string
  description: string
  setDescription: (v: string) => void
  priority: PriorityLabel
  setPriority: (v: PriorityLabel) => void
  existingImages: TaskImage[]
  onDeleteImage: (imageId: number) => void
  onFilesAdd: (files: File[]) => void
  isUploading: boolean
  onClose: () => void
  handleSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}

// --- 既存画像サムネイル ---

function ExistingImageList({
  images,
  onDelete,
}: {
  images: TaskImage[]
  onDelete: (imageId: number) => void
}) {
  if (images.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((img) => (
        <div key={img.id} className="relative group">
          <img
            src={`/${img.file_path}`}
            alt={img.original_name}
            className="h-16 w-16 rounded-md object-cover border border-border"
          />
          <button
            type="button"
            onClick={() => onDelete(img.id)}
            className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

// --- PC版 ---

function PCEditModal({
  title,
  setTitle,
  titleError,
  description,
  setDescription,
  priority,
  setPriority,
  existingImages,
  onDeleteImage,
  onFilesAdd,
  isUploading,
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
        className="w-full max-w-140 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 rounded-xl bg-background shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="relative border-b border-border p-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
              maxLength={200}
              disabled={isSubmitting}
            />
            {titleError && <p className="text-xs text-destructive">{titleError}</p>}
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

          {/* Images */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Images</label>
            <DropZone
              onFilesAdd={onFilesAdd}
              icon={Upload}
              text={isUploading ? 'アップロード中...' : 'ドラッグ&ドロップまたはクリックで画像を追加'}
            />
            <ExistingImageList images={existingImages} onDelete={onDeleteImage} />
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
  titleError,
  description,
  setDescription,
  priority,
  setPriority,
  existingImages,
  onDeleteImage,
  onFilesAdd,
  isUploading,
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
            maxLength={200}
            disabled={isSubmitting}
          />
          {titleError && <p className="text-xs text-destructive">{titleError}</p>}
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

        {/* Images */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Images</label>
          <DropZone
            onFilesAdd={onFilesAdd}
            icon={Camera}
            text={isUploading ? 'アップロード中...' : 'タップして画像を追加'}
            className="border-solid"
          />
          <ExistingImageList images={existingImages} onDelete={onDeleteImage} />
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
  const { toast } = useToast()
  const updateTask = useUpdateTask()
  const { data: existingImages = [] } = useTaskImages(open ? task.id : NaN)
  const uploadImages = useUploadTaskImages()
  const deleteImage = useDeleteTaskImage()

  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<PriorityLabel>('Normal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // モーダルが開くたびにtaskの値でリセット
  useEffect(() => {
    if (open) {
      setTitle(task.title)
      setTitleError('')
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

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (titleError) setTitleError('')
  }

  // 画像を即座にアップロード（Save Changesとは独立）
  const onFilesAdd = async (files: File[]) => {
    try {
      await uploadImages.mutateAsync({ taskId: task.id, files })
    } catch (err) {
      console.error('画像アップロードに失敗:', err)
      toast('画像のアップロードに失敗しました', 'error')
    }
  }

  const onDeleteImage = (imageId: number) => {
    deleteImage.mutate(
      { taskId: task.id, imageId },
      { onError: () => toast('画像の削除に失敗しました', 'error') },
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateTitle(title)
    if (err) {
      setTitleError(err)
      return
    }
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
      toast('タスクを更新しました', 'success')
    } catch (err) {
      console.error('タスク更新に失敗:', err)
      toast('タスクの更新に失敗しました', 'error')
      setIsSubmitting(false)
    }
  }

  const formProps: FormProps = {
    title,
    setTitle: handleTitleChange,
    titleError,
    description,
    setDescription,
    priority,
    setPriority,
    existingImages,
    onDeleteImage,
    onFilesAdd,
    isUploading: uploadImages.isPending,
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
