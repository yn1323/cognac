// 画像ドロップゾーン — ドラッグ&ドロップ or クリックで画像を追加

import { useState, useCallback, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropZoneProps {
  onFilesAdd: (files: File[]) => void
  icon: LucideIcon
  text: string
  className?: string
}

export function DropZone({ onFilesAdd, icon: Icon, text, className }: DropZoneProps) {
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
