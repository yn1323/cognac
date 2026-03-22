// PR作成モーダル
// 確認→進捗→結果の3フェーズUI

import type { GitBranch, GitPullRequestResponse, PrStepStatus } from '@cognac/shared'
import {
  AlertCircle,
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  ExternalLink,
  GitPullRequest,
  Loader2,
  MinusCircle,
  Search,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useEscapeClose, useScrollLock } from '@/hooks/use-scroll-lock'

interface PrModalProps {
  open: boolean
  onClose: () => void
  currentBranch: string
  baseBranch: string
  branches: GitBranch[]
  defaultBranch: string
  onSubmit: (baseBranch: string) => void
  isPending: boolean
  result: GitPullRequestResponse | null | undefined
  error: Error | null
}

// ステップアイコンを返す
function StepIcon({ status }: { status: PrStepStatus }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    case 'in-progress':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
    case 'skipped':
      return <MinusCircle className="h-5 w-5 text-gray-400" />
    default:
      return <Circle className="h-5 w-5 text-gray-300" />
  }
}

// フェイク進捗のステップ定義
const FAKE_STEPS = [
  { id: 'stage', label: '変更をステージング' },
  { id: 'commit', label: 'AIコミット' },
  { id: 'push', label: 'リモートにPush' },
  { id: 'create-pr', label: 'PR作成' },
] as const

// ブランチセレクター（PR作成モーダル用）
function BaseBranchSelector({
  selectedBranch,
  onSelect,
  branches,
  baseBranch,
  defaultBranch,
  currentBranch,
}: {
  selectedBranch: string
  onSelect: (branch: string) => void
  branches: GitBranch[]
  baseBranch: string
  defaultBranch: string
  currentBranch: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // 開いた時にフォーカス
  useEffect(() => {
    if (isOpen) {
      setFilter('')
      inputRef.current?.focus()
    }
  }, [isOpen])

  // 推奨ブランチ（重複排除）
  const recommended = useMemo(() => {
    const list: string[] = [baseBranch]
    if (defaultBranch !== baseBranch) list.push(defaultBranch)
    return list
  }, [baseBranch, defaultBranch])

  // 全ブランチ一覧（currentBranch除外、リモートonly除外、推奨除外、フィルター適用）
  const filteredBranches = useMemo(() => {
    return branches
      .filter((b) => !b.remote && b.name !== currentBranch && !recommended.includes(b.name))
      .filter((b) => !filter || b.name.toLowerCase().includes(filter.toLowerCase()))
      .map((b) => b.name)
  }, [branches, currentBranch, recommended, filter])

  const handleSelect = (branch: string) => {
    onSelect(branch)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground hover:bg-accent"
      >
        {selectedBranch}
        <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          {/* 検索インプット */}
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="ブランチを検索..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* 推奨セクション */}
          <div className="px-3 py-1.5">
            <span className="text-xs text-muted-foreground">推奨</span>
          </div>
          {recommended.map((name) => (
            <button
              key={`rec-${name}`}
              type="button"
              onClick={() => handleSelect(name)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer"
            >
              <span className="flex-1 truncate">{name}</span>
              {selectedBranch === name && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}

          {/* 区切り線 + 全ブランチ */}
          {filteredBranches.length > 0 && (
            <>
              <div className="border-t border-border px-3 py-1.5">
                <span className="text-xs text-muted-foreground">すべてのブランチ</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {filteredBranches.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelect(name)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer"
                  >
                    <span className="flex-1 truncate">{name}</span>
                    {selectedBranch === name && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function PrModal({
  open,
  onClose,
  currentBranch,
  baseBranch,
  branches,
  defaultBranch,
  onSubmit,
  isPending,
  result,
  error: _error,
}: PrModalProps) {
  useScrollLock(open)
  useEscapeClose(open, onClose)

  const [selectedBranch, setSelectedBranch] = useState(baseBranch)

  // フェイク進捗用state
  const [fakeStatuses, setFakeStatuses] = useState<Record<string, PrStepStatus>>({})

  // open が true になったとき selectedBranch を baseBranch にリセット
  useEffect(() => {
    if (open) {
      setSelectedBranch(baseBranch)
    }
  }, [open, baseBranch])

  useEffect(() => {
    if (!isPending) {
      setFakeStatuses({})
      return
    }

    // フェイク進捗タイマー
    const timers: ReturnType<typeof setTimeout>[] = []

    // 0秒: stage開始
    setFakeStatuses({
      stage: 'in-progress',
      commit: 'pending',
      push: 'pending',
      'create-pr': 'pending',
    })

    // 1秒: stage完了、commit開始
    timers.push(
      setTimeout(() => {
        setFakeStatuses({
          stage: 'done',
          commit: 'in-progress',
          push: 'pending',
          'create-pr': 'pending',
        })
      }, 1000),
    )

    // 3秒: commit完了、push開始
    timers.push(
      setTimeout(() => {
        setFakeStatuses({
          stage: 'done',
          commit: 'done',
          push: 'in-progress',
          'create-pr': 'pending',
        })
      }, 3000),
    )

    // 5秒: push完了、create-pr開始
    timers.push(
      setTimeout(() => {
        setFakeStatuses({ stage: 'done', commit: 'done', push: 'done', 'create-pr': 'in-progress' })
      }, 5000),
    )

    return () => {
      for (const t of timers) clearTimeout(t)
    }
  }, [isPending])

  if (!open) return null

  // フェーズ判定
  const isConfirm = !isPending && result === undefined
  const isProgress = isPending
  const isResult = !isPending && result !== undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-black/38" onClick={isProgress ? undefined : onClose} />

      {/* モーダル本体 */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative mx-4 w-full max-w-[480px] rounded-lg border border-border bg-card shadow-[0_20px_20px_#0000001a,0_10px_10px_#0000000a]"
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-3 p-6 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <GitPullRequest className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Pull Request 作成</h2>
        </div>

        {/* フェーズ1: 確認 */}
        {isConfirm && (
          <>
            <div className="flex flex-col gap-4 px-6 pb-4">
              {/* 説明テキスト */}
              <p className="text-sm leading-relaxed text-muted-foreground">
                PRを作成します。未コミットの変更があればAIコミット → Push →
                PR作成/更新まで全自動で行います。
              </p>

              {/* ソースブランチ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">ソースブランチ</label>
                <code className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono">
                  {currentBranch}
                </code>
              </div>

              {/* 矢印 + 要約 */}
              <div className="flex w-full items-center justify-center gap-2">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {currentBranch} → {selectedBranch} へPR作成
                </span>
              </div>

              {/* マージ先ブランチ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  マージ先ブランチ
                </label>
                <BaseBranchSelector
                  selectedBranch={selectedBranch}
                  onSelect={setSelectedBranch}
                  branches={branches}
                  baseBranch={baseBranch}
                  defaultBranch={defaultBranch}
                  currentBranch={currentBranch}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={() => onSubmit(selectedBranch)}>
                <GitPullRequest className="h-4 w-4" />
                PR作成
              </Button>
            </div>
          </>
        )}

        {/* フェーズ2: 進捗 */}
        {isProgress && (
          <div className="px-6 pb-6">
            <div className="flex flex-col gap-3">
              {FAKE_STEPS.map((step) => (
                <div key={step.id} className="flex items-center gap-3">
                  <StepIcon status={fakeStatuses[step.id] ?? 'pending'} />
                  <span
                    className={`text-sm ${
                      fakeStatuses[step.id] === 'in-progress'
                        ? 'font-medium text-foreground'
                        : fakeStatuses[step.id] === 'done'
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/60'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* フェーズ3: 結果 */}
        {isResult && result && (
          <>
            <div className="px-6 pb-4">
              {result.success && result.pr ? (
                <div className="flex flex-col gap-3">
                  {/* 成功バッジ */}
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        result.isUpdate
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {result.isUpdate ? '更新' : '新規作成'}
                    </span>
                  </div>

                  {/* PRカード */}
                  <div className="rounded-md border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          #{result.pr.number}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {result.pr.title}
                        </span>
                      </div>
                      {result.pr.url && (
                        <a
                          href={result.pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-primary hover:bg-primary/10"
                        >
                          開く
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* エラー表示 */}
                  <div className="flex items-start gap-2 rounded-md bg-red-50 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <span className="text-sm text-red-700">{result.error}</span>
                  </div>

                  {/* どこまで成功したか表示 */}
                  {result.steps.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {result.steps.map((step) => (
                        <div key={step.id} className="flex items-center gap-3">
                          <StepIcon status={step.status} />
                          <span className="text-sm text-muted-foreground">{step.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end px-6 pb-6">
              <Button variant="primary" onClick={onClose}>
                閉じる
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
