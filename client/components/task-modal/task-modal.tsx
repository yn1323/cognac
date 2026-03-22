// タスク作成モーダル
// PC: オーバーレイ + センターモーダル / SP: フルスクリーンシート
// デザイン design.pen PC=wLVYI, SP=qi7HK に準拠

import type { DiscussionDepth } from '@cognac/shared'
import { Camera, Loader2, Upload, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DiscussionDepthRadio } from '@/components/discussion-depth-radio'
import { MobileModalFooter } from '@/components/mobile-modal-footer'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { DropZone } from '@/components/ui/drop-zone'
import { ImagePreviewList } from '@/components/ui/image-preview-list'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useEscapeClose, useScrollLock } from '@/hooks/use-scroll-lock'
import { useCreateTask, useUploadTaskImages } from '@/hooks/use-tasks'
import { validateTitle } from '@/lib/validation'

interface FormProps {
  title: string
  setTitle: (v: string) => void
  titleError: string
  description: string
  setDescription: (v: string) => void
  discussionDepth: DiscussionDepth
  setDiscussionDepth: (v: DiscussionDepth) => void
  files: File[]
  onFilesAdd: (newFiles: File[]) => void
  onFileRemove: (index: number) => void
  handleClose: () => void
  handleSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}

// --- PC版 ---

function PCTaskModal({
  title,
  setTitle,
  titleError,
  description,
  setDescription,
  discussionDepth,
  setDiscussionDepth,
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
            className="absolute top-5 right-5 cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold text-foreground">新規タスク作成</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            新しいタスクを作成して実行キューに追加します
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">タイトル</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: ユーザー認証を実装する"
              maxLength={200}
              disabled={isSubmitting}
            />
            {titleError && <p className="text-xs text-destructive">{titleError}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">説明</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="タスクの詳細を入力（任意）"
              className="h-25 resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Discussion Depth */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">議論ラウンド数</label>
            <DiscussionDepthRadio value={discussionDepth} onChange={setDiscussionDepth} />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">画像（任意）</label>
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
              キャンセル
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  作成中...
                </>
              ) : (
                'タスク作成'
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
  titleError,
  description,
  setDescription,
  discussionDepth,
  setDiscussionDepth,
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
        <h2 className="text-lg font-semibold text-foreground">新規タスク</h2>
        <button type="button" onClick={handleClose} className="rounded-lg p-1 text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* スクロールボディ */}
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <p className="text-[13px] text-muted-foreground">新しいタスクを作成してキューに追加</p>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">タイトル</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: ユーザー認証を実装する"
            maxLength={200}
            disabled={isSubmitting}
          />
          {titleError && <p className="text-xs text-destructive">{titleError}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">説明</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="タスクの詳細を入力（任意）"
            className="h-25 resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Discussion Depth */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">議論ラウンド数</label>
          <DiscussionDepthRadio value={discussionDepth} onChange={setDiscussionDepth} />
        </div>

        {/* Images */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">画像（任意）</label>
          <DropZone
            onFilesAdd={onFilesAdd}
            icon={Camera}
            text="タップして画像を追加"
            className="border-solid"
          />
          <ImagePreviewList files={files} onRemove={onFileRemove} />
        </div>

        {/* フッターボタン */}
        <MobileModalFooter>
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-auto min-h-10 whitespace-normal px-4 py-2 text-center"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 h-auto min-h-10 whitespace-normal bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'タスク作成'
            )}
          </Button>
        </MobileModalFooter>
      </form>
    </div>
  )
}

// --- エクスポート ---

export function TaskModal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isOpen = searchParams.get('new-task') === 'true'

  const { toast } = useToast()
  const createTask = useCreateTask()
  const uploadImages = useUploadTaskImages()

  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState('')
  const [description, setDescription] = useState('')
  const [discussionDepth, setDiscussionDepth] = useState<DiscussionDepth>(3)
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  // フォームstate リセット（モーダルを開くたびにクリア）
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setTitleError('')
      setDescription('')
      setDiscussionDepth(3)
      setFiles([])
      setIsSubmitting(false)
    }
  }, [isOpen])

  useScrollLock(isOpen)
  useEscapeClose(isOpen, handleClose)

  if (!isOpen) return null

  const onFilesAdd = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5))
  }

  const onFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (titleError) setTitleError('')
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
      // 1. タスク作成
      const task = await createTask.mutateAsync({
        title,
        description: description || undefined,
        discussion_depth: discussionDepth,
      })

      // 2. 画像があればアップロード
      if (files.length > 0) {
        await uploadImages.mutateAsync({ taskId: task.id, files })
      }

      handleClose()
      toast('タスクを作成しました', 'success')
    } catch (err) {
      console.error('タスク作成に失敗:', err)
      toast('タスクの作成に失敗しました', 'error')
      setIsSubmitting(false)
    }
  }

  const formProps: FormProps = {
    title,
    setTitle: handleTitleChange,
    titleError,
    description,
    setDescription,
    discussionDepth,
    setDiscussionDepth,
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
