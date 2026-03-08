// 新規ブランチ作成モーダル
// デザイン: スクリーンショット準拠 (マージモーダルと同スタイル)

import { useState, useEffect } from 'react'
import { GitBranchPlus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useScrollLock, useEscapeClose } from '@/hooks/use-scroll-lock'
import { MOCK_BRANCHES } from '@/pages/git/mock-data'

const localBranches = MOCK_BRANCHES.filter((b) => !b.remote)

interface NewBranchModalProps {
  open: boolean
  onClose: () => void
}

export function NewBranchModal({ open, onClose }: NewBranchModalProps) {
  const [branchName, setBranchName] = useState('')
  const [baseBranch, setBaseBranch] = useState('main')

  useScrollLock(open)
  useEscapeClose(open, onClose)

  useEffect(() => {
    if (open) setBranchName('')
  }, [open])

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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dcfce7]">
              <GitBranchPlus className="h-5 w-5 text-[#16a34a]" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              新規ブランチを作成
            </h2>
          </div>
          <p className="text-sm leading-[1.43] text-muted-foreground">
            現在のブランチまたは指定したブランチから新しいブランチを作成します。
          </p>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6">
          {/* ブランチ名 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">
              ブランチ名
            </label>
            <Input
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="feature/my-new-branch"
            />
          </div>

          {/* 作成元ブランチ */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">
              作成元ブランチ
            </label>
            <div className="relative">
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
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
          <Button variant="primary" onClick={onClose} disabled={!branchName.trim()}>
            <GitBranchPlus className="h-4 w-4" />
            ブランチを作成
          </Button>
        </div>
      </div>
    </div>
  )
}
