// Git ページ
// PC: サイドバー + メインコンテンツ(2カラム) / SP: ヘッダー + ボディ + ボトムナビ
// デザイン design.pen PC=TySUT, SP=A0mek に準拠

import type { GitBranch as GitBranchType, GitCommit, GitFile } from '@cognac/shared'
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  GitBranch,
  GitBranchPlus,
  GitMerge,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiCommitProgress } from '@/components/ai-commit-progress'
import { AppBottomNav } from '@/components/app-bottom-nav'
import { CommitExplainModal } from '@/components/commit-explain-modal'
import { GitCommitRow } from '@/components/git-commit-row'
import { GitDiffView } from '@/components/git-diff-view'
import { GitFileRow } from '@/components/git-file-row'
import { MergeModal } from '@/components/merge-modal'
import { NewBranchModal } from '@/components/new-branch-modal'
import { PageHeader } from '@/components/page-header'
import { Sidebar } from '@/components/sidebar'
import { SPHeader } from '@/components/sp-header'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  useAiCommit,
  useCheckout,
  useCreateBranch,
  useDiscardAll,
  useExplainCommit,
  useExplainWorking,
  useGitBranches,
  useGitFetch,
  useGitFileDiff,
  useGitLog,
  useGitRemoteStatus,
  useGitStatus,
  useMerge,
  usePush,
} from '@/hooks/use-git'
import { useSettings } from '@/hooks/use-system'
import { NAV_MAP } from '@/lib/constants'

// AIコミット実行中に表示するプレースホルダーログ
const COMMIT_IN_PROGRESS_LOG = [
  { text: 'AIコミットを実行中...', bold: true },
  { text: '' },
  { text: '$ git add -A' },
  { text: '$ git diff --staged' },
  { text: 'analyzing changes...' },
  { text: 'generating commit message...' },
]

// --- ブランチセレクター ---

interface BranchSelectorProps {
  branches: GitBranchType[]
  currentBranch: string
  onCheckout: (branch: string) => void
  disabled?: boolean
  className?: string
}

function BranchSelector({
  branches,
  currentBranch,
  onCheckout,
  disabled,
  className,
}: BranchSelectorProps) {
  const [open, setOpen] = useState(false)
  const localBranches = useMemo(() => branches.filter((b) => !b.remote), [branches])
  const remoteBranches = useMemo(() => branches.filter((b) => b.remote), [branches])

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-2 rounded-md border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-sm disabled:opacity-50 disabled:pointer-events-none"
      >
        <GitBranch className="h-4 w-4 text-[#1d4ed8]" />
        <span className="font-semibold text-foreground">{currentBranch}</span>
        <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 min-w-[200px] rounded-md border border-[#e5e5e5] bg-white shadow-lg">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">ローカル</div>
            {localBranches.map((b) => (
              <button
                key={b.name}
                type="button"
                onClick={() => {
                  if (b.name !== currentBranch) onCheckout(b.name)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50"
              >
                <span
                  className={
                    b.name === currentBranch ? 'font-semibold text-[#1d4ed8]' : 'text-foreground'
                  }
                >
                  {b.name}
                </span>
              </button>
            ))}
            {remoteBranches.length > 0 && (
              <>
                <div className="border-t border-[#e5e5e5] px-3 py-2 text-xs font-semibold text-muted-foreground">
                  リモート
                </div>
                {remoteBranches.map((b) => (
                  <button
                    key={`remote-${b.name}`}
                    type="button"
                    onClick={() => {
                      onCheckout(b.name)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-neutral-50"
                  >
                    {b.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// --- リモートステータスバッジ ---

function RemoteStatusBadge({ ahead, behind }: { ahead: number; behind: number }) {
  if (ahead === 0 && behind === 0) return null
  return (
    <div className="flex items-center gap-2 rounded-full bg-[#dbeafe] px-3 py-1.5 text-xs font-medium text-[#1d4ed8]">
      {ahead > 0 && (
        <span className="flex items-center gap-1">
          <ArrowUp className="h-3 w-3" />
          {ahead} ahead
        </span>
      )}
      {behind > 0 && (
        <span className="flex items-center gap-1">
          <ArrowDown className="h-3 w-3" />
          {behind} behind
        </span>
      )}
    </div>
  )
}

// --- 共通Props ---

interface GitPageViewProps {
  onNavigate: (path: string) => void
  isCommitting: boolean
  files: GitFile[]
  commits: GitCommit[]
  branches: GitBranchType[]
  currentBranch: string
  ahead: number
  behind: number
  onStartCommit: () => void
  onToggleMergeModal: () => void
  onToggleNewBranchModal: () => void
  onToggleDiscardDialog: () => void
  onCheckout: (branch: string) => void
  onPush: () => void
  onFetch: () => void
  isPushing: boolean
  isFetching: boolean
  pushPhase: 'idle' | 'pushing' | 'success'
  onExplainCommit: (hash: string, message: string) => void
  onExplainWorking: () => void
  isExplainWorkingLoading: boolean
  selectedFilePath: string | null
  onFileSelect: (path: string) => void
  fileDiff: string | null
  isFileDiffLoading: boolean
}

// --- PC版 ---

function PCGitPage({
  onNavigate,
  isCommitting,
  files,
  commits,
  branches,
  currentBranch,
  ahead,
  behind,
  onStartCommit,
  onToggleMergeModal,
  onToggleNewBranchModal,
  onToggleDiscardDialog,
  onCheckout,
  onPush,
  onFetch,
  isPushing: _isPushing,
  isFetching,
  pushPhase,
  onExplainCommit,
  onExplainWorking,
  isExplainWorkingLoading,
  selectedFilePath,
  onFileSelect,
  fileDiff,
  isFileDiffLoading,
}: GitPageViewProps) {
  return (
    <div className="flex h-screen bg-[#fafafa]">
      {/* サイドバー */}
      <Sidebar
        activeItem="Git"
        onItemClick={(label) => {
          const path = NAV_MAP[label]
          if (path) onNavigate(path)
        }}
      />

      {/* メインコンテンツ */}
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-8">
        {/* ページヘッダー */}
        <PageHeader title="Git" subtitle="ブランチ管理、変更の確認、コミット操作">
          <Button variant="outline" size="sm" onClick={onFetch} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Fetch
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleMergeModal}>
            <GitMerge className="h-4 w-4" />
            マージ
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onPush}
            disabled={pushPhase !== 'idle'}
            className={pushPhase === 'success' ? 'bg-green-600 hover:bg-green-600' : ''}
          >
            {pushPhase === 'pushing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : pushPhase === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {pushPhase === 'pushing' ? 'Pushing...' : pushPhase === 'success' ? 'Pushed!' : 'Push'}
          </Button>
        </PageHeader>

        {/* ブランチ行 */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <BranchSelector
              branches={branches}
              currentBranch={currentBranch}
              onCheckout={onCheckout}
              disabled={pushPhase !== 'idle'}
            />
          </div>
          <Button variant="outline" size="sm" onClick={onToggleNewBranchModal}>
            <GitBranchPlus className="h-4 w-4" />
            新規ブランチ
          </Button>
          <RemoteStatusBadge ahead={ahead} behind={behind} />
        </div>

        {/* 2カラムコンテンツ */}
        <div className="flex flex-1 gap-6">
          {/* 左カラム: 変更ファイル */}
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col overflow-hidden rounded-lg border border-[#e5e5e5] bg-[#fafafa] shadow-[0_1px_1.75px_#0000000d]">
              {/* AIコミット中はヘッダーなしでログのみ表示 */}
              {isCommitting ? (
                <AiCommitProgress logLines={COMMIT_IN_PROGRESS_LOG} />
              ) : (
                <>
                  {/* ヘッダー */}
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">変更ファイル</span>
                      <span className="text-sm text-muted-foreground">({files.length})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs text-[#e7000b]"
                      onClick={onToggleDiscardDialog}
                      disabled={files.length === 0}
                    >
                      <Trash2 className="h-4 w-4 text-[#e7000b]" />
                      全て破棄
                    </Button>
                  </div>

                  {/* ファイルリスト */}
                  <div className="flex flex-col">
                    {files.map((file, i) => (
                      <GitFileRow
                        key={file.path}
                        status={file.status}
                        path={file.path}
                        isLast={i === files.length - 1}
                        selected={file.path === selectedFilePath}
                        onClick={() => onFileSelect(file.path)}
                      />
                    ))}
                  </div>

                  {/* AIコミット・解説ボタン */}
                  <div className="flex gap-2 p-4">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={onStartCommit}
                      disabled={files.length === 0 || pushPhase !== 'idle'}
                    >
                      <Bot className="h-4 w-4" />
                      AI コミット
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={onExplainWorking}
                      disabled={files.length === 0 || isExplainWorkingLoading}
                    >
                      <Bot className="h-4 w-4" />
                      AI 解説
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 右カラム: ファイルdiff or コミット履歴 */}
          <div className="flex flex-1 flex-col gap-4">
            {selectedFilePath ? (
              <GitDiffView
                path={selectedFilePath}
                diff={fileDiff}
                isLoading={isFileDiffLoading}
                onClose={() => onFileSelect(selectedFilePath)}
              />
            ) : (
              <div className="flex flex-col overflow-hidden rounded-lg border border-[#e5e5e5] bg-[#fafafa] shadow-[0_1px_1.75px_#0000000d]">
                <div className="border-b border-[#e5e5e5] px-4 py-4">
                  <span className="text-sm font-semibold text-foreground">コミット履歴</span>
                </div>
                <div className="flex flex-col">
                  {commits.map((commit, i) => (
                    <GitCommitRow
                      key={commit.hash}
                      commit={commit}
                      isLast={i === commits.length - 1}
                      onExplain={() => onExplainCommit(commit.hash, commit.message)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- SP版 ---

function SPGitPage({
  onNavigate: _onNavigate,
  isCommitting,
  files,
  commits,
  branches,
  currentBranch,
  ahead,
  behind,
  onStartCommit,
  onToggleMergeModal,
  onToggleNewBranchModal,
  onToggleDiscardDialog,
  onCheckout,
  onPush,
  onFetch,
  isPushing: _isPushing,
  isFetching,
  pushPhase,
  onExplainCommit,
  onExplainWorking,
  isExplainWorkingLoading,
  selectedFilePath,
  onFileSelect,
  fileDiff,
  isFileDiffLoading,
}: GitPageViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      {/* SPヘッダー */}
      <SPHeader />

      {/* ボディ */}
      <main className="flex flex-col gap-4 p-4 pb-20">
        {/* タイトル行 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Git</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onFetch}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleNewBranchModal}
            >
              <GitBranchPlus className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onToggleMergeModal}>
              <GitMerge className="h-4 w-4" />
            </Button>
            <Button
              variant="primary"
              size="icon"
              className={`h-8 w-8 ${pushPhase === 'success' ? 'bg-green-600 hover:bg-green-600' : ''}`}
              onClick={onPush}
              disabled={pushPhase !== 'idle'}
            >
              {pushPhase === 'pushing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pushPhase === 'success' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* ブランチ行 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <BranchSelector
              branches={branches}
              currentBranch={currentBranch}
              onCheckout={onCheckout}
              disabled={pushPhase !== 'idle'}
              className="w-full [&>button]:w-full"
            />
          </div>
          <RemoteStatusBadge ahead={ahead} behind={behind} />
        </div>

        {/* 変更ファイルカード */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-[#e5e5e5] bg-[#fafafa] shadow-[0_1px_1.75px_#0000000d]">
          {/* AIコミット中はヘッダーなしでログのみ表示 */}
          {isCommitting ? (
            <AiCommitProgress logLines={COMMIT_IN_PROGRESS_LOG} />
          ) : (
            <>
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">変更ファイル</span>
                  <span className="text-sm text-muted-foreground">({files.length})</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs text-[#e7000b]"
                  onClick={onToggleDiscardDialog}
                  disabled={files.length === 0}
                >
                  <Trash2 className="h-4 w-4 text-[#e7000b]" />
                  全て破棄
                </Button>
              </div>

              {/* ファイルリスト */}
              <div className="flex flex-col">
                {files.map((file, i) => (
                  <GitFileRow
                    key={file.path}
                    status={file.status}
                    path={file.path}
                    isLast={i === files.length - 1}
                    selected={file.path === selectedFilePath}
                    onClick={() => onFileSelect(file.path)}
                  />
                ))}
              </div>

              {/* AIコミット・解説ボタン */}
              <div className="flex gap-2 p-4">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={onStartCommit}
                  disabled={files.length === 0 || pushPhase !== 'idle'}
                >
                  <Bot className="h-4 w-4" />
                  AI コミット
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onExplainWorking}
                  disabled={files.length === 0 || isExplainWorkingLoading}
                >
                  <Bot className="h-4 w-4" />
                  AI 解説
                </Button>
              </div>
            </>
          )}
        </div>

        {/* SP版: ファイルdiffモーダル */}
        {selectedFilePath && (
          <>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => onFileSelect(selectedFilePath)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-xl bg-background">
              <GitDiffView
                path={selectedFilePath}
                diff={fileDiff}
                isLoading={isFileDiffLoading}
                onClose={() => onFileSelect(selectedFilePath)}
              />
            </div>
          </>
        )}

        {/* コミット履歴 */}
        <div className="flex flex-col rounded-lg border border-[#e5e5e5] bg-[#fafafa]">
          <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
            <span className="text-sm font-semibold text-foreground">コミット履歴</span>
          </div>
          <div className="flex flex-col">
            {commits.map((commit, i) => (
              <GitCommitRow
                key={commit.hash}
                commit={commit}
                isLast={i === commits.length - 1}
                onExplain={() => onExplainCommit(commit.hash, commit.message)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* ボトムナビ */}
      <AppBottomNav activeItem="Git" />
    </div>
  )
}

// --- エクスポート ---

export function GitPage() {
  const navigate = useNavigate()
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showNewBranchModal, setShowNewBranchModal] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [explainTarget, setExplainTarget] = useState<
    { type: 'commit'; hash: string; message: string } | { type: 'working' } | null
  >(null)
  const [pushPhase, setPushPhase] = useState<'idle' | 'pushing' | 'success'>('idle')
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [])

  // データ取得フック
  const { data: settings } = useSettings()
  const { data: statusData } = useGitStatus()
  const { data: logData } = useGitLog(settings?.git?.commitLogLimit)
  const { data: branchData } = useGitBranches()
  const { data: remoteStatus } = useGitRemoteStatus()
  const { data: fileDiffData, isLoading: isFileDiffLoading } = useGitFileDiff(selectedFilePath)

  const { toast } = useToast()

  // ミューテーションフック
  const discardMutation = useDiscardAll()
  const commitMutation = useAiCommit()
  const checkoutMutation = useCheckout()
  const pushMutation = usePush()
  const fetchMutation = useGitFetch()
  const mergeMutation = useMerge()
  const createBranchMutation = useCreateBranch()
  const explainMutation = useExplainCommit()
  const explainWorkingMutation = useExplainWorking()

  // 選択中ファイルが一覧から消えたらリセット
  const files = statusData?.files ?? []
  useEffect(() => {
    if (selectedFilePath && !files.some((f) => f.path === selectedFilePath)) {
      setSelectedFilePath(null)
    }
  }, [files, selectedFilePath])

  const handleFileSelect = (path: string) => {
    setSelectedFilePath((prev) => (prev === path ? null : path))
  }

  // derived
  const commits = logData?.commits ?? []
  const branches = branchData?.branches ?? []
  const currentBranch = statusData?.currentBranch ?? ''
  const ahead = remoteStatus?.ahead ?? 0
  const behind = remoteStatus?.behind ?? 0

  const handleNavigate = (path: string) => navigate(path)
  const handleStartCommit = () =>
    commitMutation.mutate(undefined, {
      onSuccess: () => toast('コミットしました', 'success'),
      onError: () => toast('コミットに失敗しました', 'error'),
    })
  const handleToggleMergeModal = () => setShowMergeModal((v) => !v)
  const handleToggleNewBranchModal = () => setShowNewBranchModal((v) => !v)
  const handleToggleDiscardDialog = () => setShowDiscardDialog((v) => !v)
  const handleCheckout = (branch: string) =>
    checkoutMutation.mutate(branch, {
      onSuccess: () => toast('ブランチを切り替えました', 'success'),
      onError: () => toast('ブランチの切り替えに失敗しました', 'error'),
    })
  const handlePush = () => {
    setPushPhase('pushing')
    pushMutation.mutate(undefined, {
      onSuccess: () => {
        toast('Pushしました', 'success')
        setPushPhase('success')
        pushTimerRef.current = setTimeout(() => setPushPhase('idle'), 1500)
      },
      onError: () => {
        toast('Pushに失敗しました', 'error')
        setPushPhase('idle')
      },
    })
  }
  const handleFetch = () =>
    fetchMutation.mutate(undefined, {
      onSuccess: () => toast('Fetchしました', 'success'),
      onError: () => toast('Fetchに失敗しました', 'error'),
    })

  const handleDiscard = () => {
    discardMutation.mutate(undefined, {
      onSuccess: () => {
        toast('変更を破棄しました', 'success')
        setShowDiscardDialog(false)
      },
      onError: () => toast('変更の破棄に失敗しました', 'error'),
    })
  }

  const handleMerge = (from: string, into: string) => {
    mergeMutation.mutate(
      { from, into },
      {
        onSuccess: () => {
          toast('マージしました', 'success')
          setShowMergeModal(false)
        },
        onError: () => {
          toast('マージに失敗しました', 'error')
        },
      },
    )
  }

  const handleExplainCommit = (hash: string, message: string) => {
    explainMutation.reset()
    setExplainTarget({ type: 'commit', hash, message })
    explainMutation.mutate(hash)
  }

  const handleExplainWorking = () => {
    explainWorkingMutation.reset()
    setExplainTarget({ type: 'working' })
    explainWorkingMutation.mutate()
  }

  const handleCreateBranch = (name: string, base?: string) => {
    createBranchMutation.mutate(
      { name, base },
      {
        onSuccess: () => {
          toast('ブランチを作成しました', 'success')
          setShowNewBranchModal(false)
        },
        onError: () => {
          toast('ブランチの作成に失敗しました', 'error')
        },
      },
    )
  }

  const viewProps: GitPageViewProps = {
    onNavigate: handleNavigate,
    isCommitting: commitMutation.isPending,
    files,
    commits,
    branches,
    currentBranch,
    ahead,
    behind,
    onStartCommit: handleStartCommit,
    onToggleMergeModal: handleToggleMergeModal,
    onToggleNewBranchModal: handleToggleNewBranchModal,
    onToggleDiscardDialog: handleToggleDiscardDialog,
    onCheckout: handleCheckout,
    onPush: handlePush,
    onFetch: handleFetch,
    isPushing: pushMutation.isPending,
    isFetching: fetchMutation.isPending,
    pushPhase,
    onExplainCommit: handleExplainCommit,
    onExplainWorking: handleExplainWorking,
    isExplainWorkingLoading: explainWorkingMutation.isPending,
    selectedFilePath,
    onFileSelect: handleFileSelect,
    fileDiff: fileDiffData?.diff ?? null,
    isFileDiffLoading,
  }

  return (
    <>
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCGitPage {...viewProps} />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPGitPage {...viewProps} />
      </div>

      {/* モーダルは一度だけレンダリング */}
      <MergeModal
        open={showMergeModal}
        onClose={handleToggleMergeModal}
        branches={branches}
        currentBranch={currentBranch}
        onMerge={handleMerge}
      />
      <NewBranchModal
        open={showNewBranchModal}
        onClose={handleToggleNewBranchModal}
        branches={branches}
        onCreate={handleCreateBranch}
      />
      <CommitExplainModal
        open={explainTarget !== null}
        onClose={() => {
          setExplainTarget(null)
          explainMutation.reset()
          explainWorkingMutation.reset()
        }}
        commitHash={explainTarget?.type === 'commit' ? explainTarget.hash : ''}
        commitMessage={
          explainTarget?.type === 'commit' ? explainTarget.message : '未コミットの変更'
        }
        explanation={
          explainTarget?.type === 'commit'
            ? (explainMutation.data?.explanation ?? null)
            : (explainWorkingMutation.data?.explanation ?? null)
        }
        isLoading={
          explainTarget?.type === 'commit'
            ? explainMutation.isPending
            : explainWorkingMutation.isPending
        }
        isError={
          explainTarget?.type === 'commit'
            ? explainMutation.isError
            : explainWorkingMutation.isError
        }
      />
      <ConfirmDialog
        open={showDiscardDialog}
        onConfirm={handleDiscard}
        onCancel={handleToggleDiscardDialog}
        title="全ての変更を破棄"
        description="全ての未コミットの変更が失われます。この操作は取り消せません。"
        confirmLabel="全て破棄"
        cancelLabel="キャンセル"
        variant="destructive"
      />
    </>
  )
}
