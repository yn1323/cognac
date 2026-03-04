// 選択済み画像ファイルのプレビューサムネイル一覧

import { useMemo, useEffect } from 'react'
import { X } from 'lucide-react'

interface ImagePreviewListProps {
  files: File[]
  onRemove: (index: number) => void
}

export function ImagePreviewList({ files, onRemove }: ImagePreviewListProps) {
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
