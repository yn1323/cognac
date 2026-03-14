// マージモーダル
// デザイン design.pen Node=6MUix 準拠

import type { GitBranch } from '@cognac/shared'
import { ArrowDown, ChevronDown, GitMerge } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useEscapeClose, useScrollLock } from '@/hooks/use-scroll-lock'

interface MergeModalProps {
  open: boolean
  onClose: () => void
  branches: GitBranch[]
  currentBranch: string
  onMerge: (from: string, into: string) => void
}

export function MergeModal({ open, onClose, branches, currentBranch, onMerge }: MergeModalProps) {
  const localBranches = useMemo(() => branches.filter((b) => !b.remote), [branches])
  const [fromBranch, setFromBranch] = useState('')
  const [toBranch, setToBranch] = useState('')

  useScrollLock(open)
  useEscapeClose(open, onClose)

  // モーダルが開かれたときにデフォルト値をセット
  useEffect(() => {
    if (!open || localBranches.length === 0) return
    const defaultFrom =
      localBranches.find((b) => b.name !== currentBranch)?.name ?? localBranches[0].name
    setFromBranch(defaultFrom)
    setToBranch(currentBranch || localBranches[0].name)
  }, [open, localBranches, currentBranch])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-black/38" onClick={onClose} />

      {/* モーダル本体 */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative mx-4 w-full max-w-[440px] rounded-lg border border-[#e5e5e5] bg-white shadow-[0_20px_20px_#0000001a,0_10px_10px_#0000000a]"
      >
        {/* Header */}
        <div className="flex flex-col gap-3 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eff6ff]">
              <GitMerge className="h-5 w-5 text-[#2563eb]" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">ブランチをマージ</h2>
          </div>
          <p className="text-sm leading-[1.43] text-muted-foreground">
            マージ元ブランチの変更をマージ先ブランチに統合します。マージコミットが作成されます（--no-ff）。
          </p>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6">
          {/* マージ元 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">マージ元ブランチ</label>
            <div className="relative">
              <select
                value={fromBranch}
                onChange={(e) => setFromBranch(e.target.value)}
                className="w-full appearance-none rounded-md border border-[#e5e5e5] bg-white px-3 py-2 pr-8 text-sm text-foreground"
              >
                {localBranches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* 矢印 */}
          <div className="flex w-full items-center justify-center gap-2">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {fromBranch} → {toBranch} にマージ
            </span>
          </div>

          {/* マージ先 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">マージ先ブランチ</label>
            <div className="relative">
              <select
                value={toBranch}
                onChange={(e) => setToBranch(e.target.value)}
                className="w-full appearance-none rounded-md border border-[#e5e5e5] bg-white px-3 py-2 pr-8 text-sm text-foreground"
              >
                {localBranches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 pb-6 pt-4">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={() => onMerge(fromBranch, toBranch)}
            disabled={fromBranch === toBranch}
          >
            <GitMerge className="h-4 w-4" />
            マージ実行
          </Button>
        </div>
      </div>
    </div>
  )
}
