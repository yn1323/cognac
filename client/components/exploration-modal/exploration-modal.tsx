// 探索作成モーダル
// PC: オーバーレイ + センターモーダル / SP: フルスクリーンシート
// タスクモーダル（task-modal.tsx）と同じパターン

import { useState, useEffect, useCallback } from 'react'
import { useScrollLock, useEscapeClose } from '@/hooks/use-scroll-lock'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { X, Upload, Camera, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropZone } from '@/components/ui/drop-zone'
import { ImagePreviewList } from '@/components/ui/image-preview-list'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/toast'
import { validateTitle } from '@/lib/validation'
import { useCreateExploration } from '@/hooks/use-explorations'

interface FormProps {
  title: string
  setTitle: (v: string) => void
  titleError: string
  description: string
  setDescription: (v: string) => void
  descriptionError: string
  files: File[]
  onFilesAdd: (newFiles: File[]) => void
  onFileRemove: (index: number) => void
  handleClose: () => void
  handleSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}

// --- PC版 ---

function PCExplorationModal({
  title,
  setTitle,
  titleError,
  description,
  setDescription,
  descriptionError,
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
          <h2 className="text-xl font-semibold text-foreground">新規探索</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AIに調査・検証を依頼します
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              タイトル <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例）ダッシュボードのパフォーマンス分析"
              maxLength={200}
              disabled={isSubmitting}
            />
            {titleError && <p className="text-xs text-destructive">{titleError}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              説明 <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="調査したい内容を具体的に記述してください..."
              className="h-30 resize-none"
              disabled={isSubmitting}
            />
            {descriptionError && <p className="text-xs text-destructive">{descriptionError}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">画像添付（任意）</label>
            <DropZone
              onFilesAdd={onFilesAdd}
              icon={Upload}
              text="ドラッグ&ドロップまたはクリックで画像を追加"
            />
            <ImagePreviewList files={files} onRemove={onFileRemove} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              <Compass className="mr-2 h-4 w-4" />
              探索開始
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- SP版 ---

function SPExplorationModal({
  title,
  setTitle,
  titleError,
  description,
  setDescription,
  descriptionError,
  files,
  onFilesAdd,
  onFileRemove,
  handleClose,
  handleSubmit,
  isSubmitting,
}: FormProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">新規探索</h2>
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
          disabled={isSubmitting}
        >
          <Compass className="mr-1 h-3.5 w-3.5" />
          開始
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-5 overflow-y-auto p-4"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            タイトル <span className="text-destructive">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例）ダッシュボードのパフォーマンス分析"
            maxLength={200}
            disabled={isSubmitting}
          />
          {titleError && <p className="text-xs text-destructive">{titleError}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            説明 <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="調査したい内容を具体的に記述してください..."
            className="h-30 resize-none"
            disabled={isSubmitting}
          />
          {descriptionError && <p className="text-xs text-destructive">{descriptionError}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">画像添付（任意）</label>
          <DropZone
            onFilesAdd={onFilesAdd}
            icon={Camera}
            text="タップして画像をアップロード"
            className="border-solid"
          />
          <ImagePreviewList files={files} onRemove={onFileRemove} />
        </div>
      </form>
    </div>
  )
}

// --- エクスポート ---

export function ExplorationModal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isOpen = searchParams.get('new-exploration') === 'true'

  const { toast } = useToast()
  const createMutation = useCreateExploration()

  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionError, setDescriptionError] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const handleClose = useCallback(() => {
    navigate('/explorations', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setTitleError('')
      setDescription('')
      setDescriptionError('')
      setFiles([])
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

  const handleDescriptionChange = (v: string) => {
    setDescription(v)
    if (descriptionError) setDescriptionError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const titleErr = validateTitle(title)
    if (titleErr) {
      setTitleError(titleErr)
      return
    }
    if (!description.trim()) {
      setDescriptionError('説明を入力してください')
      return
    }
    createMutation.mutate(
      { data: { title, request: description.trim() }, files },
      {
        onSuccess: () => {
          toast('探索を作成しました', 'success')
          handleClose()
        },
        onError: (err) => {
          toast(err.message, 'error')
        },
      },
    )
  }

  const formProps: FormProps = {
    title,
    setTitle: handleTitleChange,
    titleError,
    description,
    setDescription: handleDescriptionChange,
    descriptionError,
    files,
    onFilesAdd,
    onFileRemove,
    handleClose,
    handleSubmit,
    isSubmitting: createMutation.isPending,
  }

  return (
    <>
      <div className="hidden md:block">
        <PCExplorationModal {...formProps} />
      </div>
      <div className="md:hidden">
        <SPExplorationModal {...formProps} />
      </div>
    </>
  )
}
