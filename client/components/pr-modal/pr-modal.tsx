// PR作成モーダル
// 確認→進捗→結果の3フェーズUI

import type { GitPullRequestResponse, PrStepStatus } from '@cognac/shared'
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ExternalLink,
  GitPullRequest,
  Loader2,
  MinusCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useEscapeClose, useScrollLock } from '@/hooks/use-scroll-lock'

interface PrModalProps {
  open: boolean
  onClose: () => void
  currentBranch: string
  baseBranch: string
  onSubmit: () => void
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

export function PrModal({
  open,
  onClose,
  currentBranch,
  baseBranch,
  onSubmit,
  isPending,
  result,
  error: _error,
}: PrModalProps) {
  useScrollLock(open)
  useEscapeClose(open, onClose)

  // フェイク進捗用state
  const [fakeStatuses, setFakeStatuses] = useState<Record<string, PrStepStatus>>({})

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
        className="relative mx-4 w-full max-w-[480px] rounded-lg border border-[#e5e5e5] bg-white shadow-[0_20px_20px_#0000001a,0_10px_10px_#0000000a]"
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-3 p-6 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eff6ff]">
            <GitPullRequest className="h-5 w-5 text-[#2563eb]" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Pull Request 作成</h2>
        </div>

        {/* フェーズ1: 確認 */}
        {isConfirm && (
          <>
            <div className="px-6 pb-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                現在のブランチ{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {currentBranch}
                </code>{' '}
                →{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {baseBranch}
                </code>{' '}
                へのPRを作成します。
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                未コミットの変更があればAIコミット → Push → PR作成/更新まで全自動で行います。
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={onSubmit}>
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
                  <div className="rounded-md border border-[#e5e5e5] p-4">
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
                          className="flex shrink-0 items-center gap-1 rounded-md border border-[#e5e5e5] px-2 py-1 text-xs text-[#2563eb] hover:bg-[#eff6ff]"
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
