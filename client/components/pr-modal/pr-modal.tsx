// PR作成モーダル
// GitHub CLI (gh) 連携によるプルリクエスト作成 + AI生成

import type { GitBranch } from '@cognac/shared'
import { ChevronDown, GitPullRequest, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { useCreatePullRequest, useGeneratePrContent, useGhStatus } from '@/hooks/use-git'
import { useEscapeClose, useScrollLock } from '@/hooks/use-scroll-lock'

interface PrModalProps {
  open: boolean
  onClose: () => void
  branches: GitBranch[]
  currentBranch: string
}

export function PrModal({ open, onClose, branches, currentBranch }: PrModalProps) {
  const [title, setTitle] = useState('')
  const [baseBranch, setBaseBranch] = useState('')
  const [body, setBody] = useState('')

  const { toast } = useToast()
  const ghStatusMutation = useGhStatus()
  const createPrMutation = useCreatePullRequest()
  const generateMutation = useGeneratePrContent()

  useScrollLock(open)
  useEscapeClose(open, onClose)

  // ローカル＋リモート両方からベースブランチ候補を算出
  const allBranchNames = useMemo(() => {
    const names = new Set<string>()
    for (const b of branches) {
      if (b.remote) {
        const short = b.name.replace(/^origin\//, '')
        names.add(short)
      } else {
        names.add(b.name)
      }
    }
    return [...names].filter((n) => n !== currentBranch)
  }, [branches, currentBranch])

  const defaultBase = useMemo(
    () =>
      allBranchNames.find((n) => n === 'develop') ??
      allBranchNames.find((n) => n === 'main') ??
      allBranchNames[0] ??
      '',
    [allBranchNames],
  )

  // モーダル開閉時にghステータスチェック＆フォームリセット
  // biome-ignore lint/correctness/useExhaustiveDependencies: mutate/resetはstableな参照なのでdepsに含めない
  useEffect(() => {
    if (!open) return
    ghStatusMutation.mutate()
    setTitle('')
    setBody('')
    setBaseBranch(defaultBase)
    generateMutation.reset()
  }, [open, defaultBase])

  // ghステータスOK時にAI生成を自動実行
  // biome-ignore lint/correctness/useExhaustiveDependencies: mutate/isPending/dataはガード条件で無限ループ防止済み
  useEffect(() => {
    if (!open) return
    if (!ghStatusMutation.data?.installed || !ghStatusMutation.data?.authenticated) return
    if (generateMutation.data || generateMutation.isPending) return
    if (!baseBranch) return
    generateMutation.mutate(
      { base: baseBranch, head: currentBranch },
      {
        onSuccess: (data) => {
          setTitle(data.title)
          setBody(data.body)
        },
      },
    )
  }, [open, ghStatusMutation.data, baseBranch])

  // AI再生成ハンドラ
  const handleRegenerate = () => {
    generateMutation.mutate(
      { base: baseBranch, head: currentBranch },
      {
        onSuccess: (data) => {
          setTitle(data.title)
          setBody(data.body)
        },
      },
    )
  }

  const handleSubmit = () => {
    createPrMutation.mutate(
      { title, base: baseBranch, head: currentBranch, body: body || undefined },
      {
        onSuccess: (data) => {
          if (data.created) {
            toast(`PR #${data.number} を作成しました`, 'success')
          } else {
            toast(`既存の PR #${data.number} があります: ${data.url}`, 'success')
          }
          onClose()
        },
        onError: (err) => {
          toast(err instanceof Error ? err.message : 'PR作成に失敗しました', 'error')
        },
      },
    )
  }

  if (!open) return null

  const ghStatus = ghStatusMutation.data
  const isCheckingGh = ghStatusMutation.isPending

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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0fdf4]">
              <GitPullRequest className="h-5 w-5 text-[#16a34a]" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">プルリクエストを作成</h2>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6">
          {isCheckingGh ? (
            // ローディング中
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ghStatus && !ghStatus.installed ? (
            // gh未インストール
            <div className="flex flex-col gap-3 py-4">
              <p className="text-sm text-muted-foreground">
                GitHub CLIがインストールされていません。PRを作成するにはGitHub CLIが必要です。
              </p>
              <a
                href="https://cli.github.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#2563eb] underline"
              >
                GitHub CLIをインストール →
              </a>
            </div>
          ) : ghStatus && !ghStatus.authenticated ? (
            // gh未認証
            <div className="flex flex-col gap-3 py-4">
              <p className="text-sm text-muted-foreground">
                GitHub CLIで認証が必要です。以下のコマンドを実行してログインしてください。
              </p>
              <code className="rounded-md bg-[#f5f5f5] px-3 py-2 text-sm font-mono text-foreground">
                gh auth login
              </code>
            </div>
          ) : (
            // PR作成フォーム
            <>
              {/* ベースブランチ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">ベースブランチ</label>
                <div className="relative">
                  <select
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                    className="w-full appearance-none rounded-md border border-[#e5e5e5] bg-white px-3 py-2 pr-8 text-sm text-foreground"
                  >
                    {allBranchNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* ヘッドブランチ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">ヘッドブランチ</label>
                <div className="rounded-md border border-[#e5e5e5] bg-[#f5f5f5] px-3 py-2 text-sm text-foreground">
                  {currentBranch}
                </div>
              </div>

              {/* AI生成コンテンツ */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">
                    PR内容（AI生成）
                  </label>
                  {generateMutation.data && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerate}
                      disabled={generateMutation.isPending}
                      className="h-7 gap-1 text-xs text-muted-foreground"
                    >
                      {generateMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      再生成
                    </Button>
                  )}
                </div>

                {generateMutation.isPending ? (
                  // 生成中
                  <div className="flex flex-col gap-2 rounded-md border border-[#e5e5e5] bg-[#f9f9f9] p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AIがPR内容を生成中...
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-[#e5e5e5]" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-[#e5e5e5]" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-[#e5e5e5]" />
                    </div>
                  </div>
                ) : generateMutation.isError ? (
                  // エラー
                  <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-600">
                      {generateMutation.error instanceof Error
                        ? generateMutation.error.message
                        : 'PR内容の生成に失敗しました'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerate}
                      className="w-fit gap-1 text-xs"
                    >
                      <Sparkles className="h-3 w-3" />
                      再生成
                    </Button>
                  </div>
                ) : title ? (
                  // 生成結果プレビュー
                  <div className="flex flex-col gap-2 rounded-md border border-[#e5e5e5] bg-[#f9f9f9] p-4">
                    <div className="text-sm font-medium text-foreground">{title}</div>
                    {body && (
                      <div className="whitespace-pre-wrap text-xs text-muted-foreground">
                        {body}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6 pt-4">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          {ghStatus?.installed && ghStatus?.authenticated && (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!title.trim() || createPrMutation.isPending || generateMutation.isPending}
            >
              {createPrMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GitPullRequest className="h-4 w-4" />
              )}
              PR作成
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
