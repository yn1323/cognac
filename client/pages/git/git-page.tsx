// Git ページ
// PC: サイドバー + メインコンテンツ(2カラム) / SP: ヘッダー + ボディ + ボトムナビ
// デザイン design.pen PC=TySUT, SP=A0mek に準拠

import type { GitBranch as GitBranchType, GitCommit, GitFile } from '@cognac/shared'
import {
  ArrowDown,
  ArrowUp,
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
import { AppBottomNav } from '@/components/app-bottom-nav'
import { CommitExplainModal } from '@/components/commit-explain-modal'
import { GitCommitRow } from '@/components/git-commit-row'
import { GitDiffView } from '@/components/git-diff-view'
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
  useDeleteBranch,
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
  useRevert,
} from '@/hooks/use-git'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import { useSettings } from '@/hooks/use-system'
import { NAV_MAP } from '@/lib/constants'
import { ChangedFilesPanel } from './changed-files-panel'

// --- ブランチセレクター ---

const PROTECTED_BRANCHES = ['main', 'master', 'develop']

interface BranchSelectorProps {
  branches: GitBranchType[]
  currentBranch: string
  onCheckout: (branch: string) => void
  onDeleteBranch?: (branch: string) => void
  disabled?: boolean
  className?: string
}

function BranchSelector({
  branches,
  currentBranch,
  onCheckout,
  onDeleteBranch,
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
          <div className="absolute z-50 mt-1 min-w-[240px] rounded-md border border-[#e5e5e5] bg-white shadow-lg">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">ローカル</div>
            {localBranches.map((b) => (
              <button
                key={b.name}
                type="button"
                onClick={() => {
                  if (b.name !== currentBranch) onCheckout(b.name)
                  setOpen(false)
                }}
                className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50"
              >
                <span
                  className={`flex-1 truncate ${
                    b.name === currentBranch ? 'font-semibold text-[#1d4ed8]' : 'text-foreground'
                  }`}
                >
                  {b.name}
                </span>
                {b.name !== currentBranch &&
                  !PROTECTED_BRANCHES.includes(b.name) &&
                  onDeleteBranch && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpen(false)
                        onDeleteBranch(b.name)
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-100 transition-opacity hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
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
  onDeleteBranch: (branch: string) => void
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
  onRevertCommit: (hash: string, message: string) => void
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
  onDeleteBranch,
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
  onRevertCommit,
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
              onDeleteBranch={onDeleteBranch}
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
            <ChangedFilesPanel
              isCommitting={isCommitting}
              files={files}
              selectedFilePath={selectedFilePath}
              onFileSelect={onFileSelect}
              onStartCommit={onStartCommit}
              onExplainWorking={onExplainWorking}
              isExplainWorkingLoading={isExplainWorkingLoading}
              onToggleDiscardDialog={onToggleDiscardDialog}
              commitDisabled={pushPhase !== 'idle'}
            />
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
                      onRevert={() => onRevertCommit(commit.hash, commit.message)}
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
  onDeleteBranch,
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
  onRevertCommit,
}: GitPageViewProps) {
  useScrollLock(!!selectedFilePath)

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* SPヘッダー */}
      <SPHeader />

      {/* ボディ */}
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-20">
        {/* タイトル行 */}
        <div className="flex shrink-0 items-center justify-between">
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
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex-1">
            <BranchSelector
              branches={branches}
              currentBranch={currentBranch}
              onCheckout={onCheckout}
              onDeleteBranch={onDeleteBranch}
              disabled={pushPhase !== 'idle'}
              className="w-full [&>button]:w-full"
            />
          </div>
          <RemoteStatusBadge ahead={ahead} behind={behind} />
        </div>

        {/* 変更ファイルカード */}
        <div className="shrink-0">
          <ChangedFilesPanel
            isCommitting={isCommitting}
            files={files}
            selectedFilePath={selectedFilePath}
            onFileSelect={onFileSelect}
            onStartCommit={onStartCommit}
            onExplainWorking={onExplainWorking}
            isExplainWorkingLoading={isExplainWorkingLoading}
            onToggleDiscardDialog={onToggleDiscardDialog}
            commitDisabled={pushPhase !== 'idle'}
          />
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
        <div className="flex shrink-0 flex-col rounded-lg border border-[#e5e5e5] bg-[#fafafa]">
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
                onRevert={() => onRevertCommit(commit.hash, commit.message)}
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
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [explainTarget, setExplainTarget] = useState<
    { type: 'commit'; hash: string; message: string } | { type: 'working' } | null
  >(null)
  const [revertTarget, setRevertTarget] = useState<{ hash: string; message: string } | null>(null)
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
  const deleteBranchMutation = useDeleteBranch()
  const explainMutation = useExplainCommit()
  const explainWorkingMutation = useExplainWorking()
  const revertMutation = useRevert()

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

  const handleRevertCommit = (hash: string, message: string) => {
    setRevertTarget({ hash, message })
  }

  const handleConfirmRevert = () => {
    if (!revertTarget) return
    revertMutation.mutate(revertTarget.hash, {
      onSuccess: () => {
        toast('リバートしました', 'success')
        setRevertTarget(null)
      },
      onError: (err) => {
        toast(err instanceof Error ? err.message : 'リバートに失敗しました', 'error')
        setRevertTarget(null)
      },
    })
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

  const handleDeleteBranch = (name: string) => {
    setDeletingBranch(name)
  }

  const handleConfirmDelete = () => {
    if (!deletingBranch) return
    deleteBranchMutation.mutate(deletingBranch, {
      onSuccess: () => {
        toast('ブランチを削除しました', 'success')
        setDeletingBranch(null)
      },
      onError: () => {
        toast('ブランチの削除に失敗しました', 'error')
        setDeletingBranch(null)
      },
    })
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
    onDeleteBranch: handleDeleteBranch,
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
    onRevertCommit: handleRevertCommit,
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
      <ConfirmDialog
        open={deletingBranch !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingBranch(null)}
        title="ブランチを削除"
        description={`ブランチ「${deletingBranch}」を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        variant="destructive"
        isLoading={deleteBranchMutation.isPending}
      />
      <ConfirmDialog
        open={revertTarget !== null}
        onConfirm={handleConfirmRevert}
        onCancel={() => setRevertTarget(null)}
        title="コミットをリバート"
        description={
          revertTarget && (
            <>
              コミット{' '}
              <code className="rounded bg-muted px-1 font-mono text-xs">{revertTarget.hash}</code>{' '}
              をリバートします。
              <p className="mt-1 truncate">{revertTarget.message}</p>
            </>
          )
        }
        confirmLabel="リバートする"
        cancelLabel="キャンセル"
        variant="destructive"
        isLoading={revertMutation.isPending}
      />
    </>
  )
}
