// 探索詳細ページ
// タブ切り替えで 概要 / ディスカッション / ログ / レポート を表示
// PC: サイドバー + メインコンテンツ / SP: SPDetailHeader + ボディ
// タスク詳細（task-page.tsx）と同じパターン

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  EllipsisVertical,
  Loader,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import type { ExplorationSession, ExplorationEvent } from '@cognac/shared'
import { useToast } from '@/components/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Sidebar } from '@/components/sidebar'
import { SPDetailHeader } from '@/components/sp-detail-header'
import { ExplorationTabs, type ExplorationTab } from '@/components/exploration-tabs'
import { ExplorationStatusBadge } from '@/components/exploration-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { NAV_MAP } from '@/lib/constants'
import {
  EXPLORATION_STATUS_CONFIG,
  EXPLORATION_ACTIVE_STATUSES,
  EXPLORATION_CANCELABLE_STATUSES,
  EXPLORATION_DELETABLE_STATUSES,
  EXPLORATION_RETRYABLE_STATUSES,
} from '@/lib/exploration-status-config'
import { useCancelExploration, useDeleteExploration, useExploration, useRetryExploration } from '@/hooks/use-explorations'
import { useExplorationSSE } from '@/hooks/use-exploration-sse'
import { PCOverviewTab, SPOverviewTab } from '@/pages/exploration-detail/overview-tab'
import { PCDiscussionTab, SPDiscussionTab } from '@/pages/exploration-detail/discussion-tab'
import { PCLogsTab, SPLogsTab } from '@/pages/exploration-detail/logs-tab'
import { PCReportTab, SPReportTab } from '@/pages/exploration-detail/report-tab'

// --- タブボディ ---

function PCTabBody({
  activeTab,
  exploration,
  events,
  connected,
}: {
  activeTab: ExplorationTab
  exploration: ExplorationSession
  events: ExplorationEvent[]
  connected: boolean
}) {
  switch (activeTab) {
    case '概要':
      return <PCOverviewTab exploration={exploration} />
    case 'ディスカッション':
      return <PCDiscussionTab exploration={exploration} />
    case 'ログ':
      return <PCLogsTab exploration={exploration} events={events} connected={connected} />
    case 'レポート':
      return <PCReportTab exploration={exploration} />
  }
}

function SPTabBody({
  activeTab,
  exploration,
  events,
  connected,
}: {
  activeTab: ExplorationTab
  exploration: ExplorationSession
  events: ExplorationEvent[]
  connected: boolean
}) {
  switch (activeTab) {
    case '概要':
      return <SPOverviewTab exploration={exploration} />
    case 'ディスカッション':
      return <SPDiscussionTab exploration={exploration} />
    case 'ログ':
      return <SPLogsTab exploration={exploration} events={events} connected={connected} />
    case 'レポート':
      return <SPReportTab exploration={exploration} />
  }
}

// --- PC版 ---

function PCExplorationDetail({
  exploration,
  activeTab,
  onTabChange,
  onNavigate,
  onDelete,
  onRetry,
  onCancel,
  canDelete,
  canRetry,
  canCancel,
  isDeleting,
  isRetrying,
  isCancelling,
  events,
  connected,
}: {
  exploration: ExplorationSession
  activeTab: ExplorationTab
  onTabChange: (tab: ExplorationTab) => void
  onNavigate: (path: string) => void
  onDelete: () => void
  onRetry: () => void
  onCancel: () => void
  canDelete: boolean
  canRetry: boolean
  canCancel: boolean
  isDeleting: boolean
  isRetrying: boolean
  isCancelling: boolean
  events: ExplorationEvent[]
  connected: boolean
}) {
  const config = EXPLORATION_STATUS_CONFIG[exploration.status]

  return (
    <div className="flex h-dvh bg-background">
      <Sidebar
        activeItem="探索"
        onItemClick={(label) => {
          const path = NAV_MAP[label]
          if (path) onNavigate(path)
        }}
        className="h-full shrink-0"
      />

      <main className="flex flex-1 flex-col gap-6 overflow-hidden p-8">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5 text-[13px]">
            <button
              type="button"
              className="text-[#2563eb] hover:underline"
              onClick={() => onNavigate('/explorations')}
            >
              探索
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">探索 #{exploration.id}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-[22px] font-semibold leading-[1.3] text-foreground">
                {exploration.title}
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant={config.badgeVariant}>{config.label}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canCancel ? (
                <Button variant="destructive" size="sm" onClick={onCancel} disabled={isCancelling}>
                  キャンセル
                </Button>
              ) : (
                <>
                  {canRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      リトライ
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="destructive" size="sm" onClick={onDelete} disabled={isDeleting}>
                      削除
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <ExplorationTabs activeTab={activeTab} onTabChange={onTabChange} variant="pc" />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <PCTabBody activeTab={activeTab} exploration={exploration} events={events} connected={connected} />
        </div>
      </main>
    </div>
  )
}

// --- SP版 ---

function SPExplorationDetail({
  exploration,
  activeTab,
  onTabChange,
  onNavigate,
  onDelete,
  onRetry,
  onCancel,
  canDelete,
  canRetry,
  canCancel,
  isDeleting,
  isRetrying,
  isCancelling,
  events,
  connected,
}: {
  exploration: ExplorationSession
  activeTab: ExplorationTab
  onTabChange: (tab: ExplorationTab) => void
  onNavigate: (path: string) => void
  onDelete: () => void
  onRetry: () => void
  onCancel: () => void
  canDelete: boolean
  canRetry: boolean
  canCancel: boolean
  isDeleting: boolean
  isRetrying: boolean
  isCancelling: boolean
  events: ExplorationEvent[]
  connected: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const config = EXPLORATION_STATUS_CONFIG[exploration.status]

  return (
    <div className="flex h-dvh flex-col bg-background">
      <SPDetailHeader
        title={exploration.title}
        subtitle={`探索 #${exploration.id} · ${config.label}`}
        onBack={() => onNavigate('/explorations')}
        actions={
          (canDelete || canRetry || canCancel) ? (
            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted-foreground"
                >
                  <EllipsisVertical className="h-5 w-5" />
                </button>
              }
              open={menuOpen}
              onOpenChange={setMenuOpen}
              align="right"
            >
              {canCancel && (
                <DropdownMenuItem
                  onClick={() => {
                    setMenuOpen(false)
                    onCancel()
                  }}
                  variant="destructive"
                  icon={XCircle}
                  disabled={isCancelling}
                >
                  キャンセル
                </DropdownMenuItem>
              )}
              {canRetry && (
                <DropdownMenuItem
                  onClick={() => {
                    setMenuOpen(false)
                    onRetry()
                  }}
                  icon={RefreshCw}
                  disabled={isRetrying}
                >
                  リトライ
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete()
                  }}
                  variant="destructive"
                  icon={Trash2}
                  disabled={isDeleting}
                >
                  削除
                </DropdownMenuItem>
              )}
            </DropdownMenu>
          ) : undefined
        }
      >
        <ExplorationTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          variant="sp"
        />
      </SPDetailHeader>

      <main className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SPTabBody activeTab={activeTab} exploration={exploration} events={events} connected={connected} />
        </div>
      </main>
    </div>
  )
}

// --- エクスポート ---

export function ExplorationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const explorationId = Number(id)
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<ExplorationTab>('概要')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const { data: exploration, isLoading, isError } = useExploration(explorationId)
  const deleteMutation = useDeleteExploration()
  const retryMutation = useRetryExploration()
  const cancelMutation = useCancelExploration()

  // SSE: アクティブ状態（discussing/executing/reviewing）のときだけ接続
  const isActive = exploration?.status != null && EXPLORATION_ACTIVE_STATUSES.has(exploration.status)
  const { events, connected } = useExplorationSSE(isActive ? explorationId : null)

  // SSEイベント → queryキャッシュinvalidation
  useEffect(() => {
    if (events.length === 0 || !exploration) return
    const last = events[events.length - 1]

    if (last.type === 'persona_selected') {
      qc.invalidateQueries({ queryKey: ['explorations', explorationId, 'personas'] })
    }
    if (last.type === 'discussion_statement' || last.type === 'discussion_round_end') {
      qc.invalidateQueries({ queryKey: ['explorations', explorationId, 'discussions'] })
    }
    if (last.type === 'phase_end') {
      qc.invalidateQueries({ queryKey: ['explorations', explorationId, 'logs'] })
    }
    if (last.type === 'report_created') {
      qc.invalidateQueries({ queryKey: ['explorations', explorationId, 'report'] })
      qc.invalidateQueries({ queryKey: ['explorations', explorationId] })
    }
    if (last.type === 'artifact_created') {
      qc.invalidateQueries({ queryKey: ['explorations', explorationId, 'artifacts'] })
    }
    if (last.type === 'completed' || last.type === 'paused' || last.type === 'error') {
      qc.invalidateQueries({ queryKey: ['explorations', explorationId] })
      qc.invalidateQueries({ queryKey: ['explorations', explorationId, 'logs'] })
      qc.invalidateQueries({ queryKey: ['explorations'], exact: true })
    }
    if (last.type === 'taskify_started' || last.type === 'taskify_completed' || last.type === 'taskify_failed') {
      qc.invalidateQueries({ queryKey: ['explorations', explorationId] })
    }
  }, [events.length, exploration, explorationId, qc])

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !exploration) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          探索セッションが見つかりませんでした
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/explorations')}>
          一覧に戻る
        </Button>
      </div>
    )
  }

  const hasActiveTaskify =
    exploration.latestTaskifyJob?.status === 'pending' ||
    exploration.latestTaskifyJob?.status === 'running'
  const canDelete =
    EXPLORATION_DELETABLE_STATUSES.has(exploration.status) &&
    !hasActiveTaskify
  const canRetry = EXPLORATION_RETRYABLE_STATUSES.has(exploration.status)
  const canCancel = EXPLORATION_CANCELABLE_STATUSES.has(exploration.status)

  const handleDelete = () => setDeleteDialogOpen(true)
  const handleConfirmDelete = () => {
    deleteMutation.mutate(explorationId, {
      onSuccess: () => {
        toast('探索を削除しました', 'success')
        navigate('/explorations')
      },
      onError: (err) => {
        toast(err.message, 'error')
      },
    })
  }

  const handleRetry = () => {
    retryMutation.mutate(explorationId, {
      onSuccess: () => toast('探索を最初から再実行する状態に戻しました', 'success'),
      onError: (err) => toast(err.message, 'error'),
    })
  }

  const handleCancel = () => setCancelDialogOpen(true)
  const handleConfirmCancel = () => {
    cancelMutation.mutate(explorationId, {
      onSuccess: () => {
        toast('探索をキャンセルしました', 'success')
        setCancelDialogOpen(false)
      },
      onError: (err) => toast(err.message, 'error'),
    })
  }

  return (
    <>
      <div className="hidden md:block">
        <PCExplorationDetail
          exploration={exploration}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNavigate={navigate}
          onDelete={handleDelete}
          onRetry={handleRetry}
          onCancel={handleCancel}
          canDelete={canDelete}
          canRetry={canRetry}
          canCancel={canCancel}
          isDeleting={deleteMutation.isPending}
          isRetrying={retryMutation.isPending}
          isCancelling={cancelMutation.isPending}
          events={events}
          connected={connected}
        />
      </div>
      <div className="md:hidden">
        <SPExplorationDetail
          exploration={exploration}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNavigate={navigate}
          onDelete={handleDelete}
          onRetry={handleRetry}
          onCancel={handleCancel}
          canDelete={canDelete}
          canRetry={canRetry}
          canCancel={canCancel}
          isDeleting={deleteMutation.isPending}
          isRetrying={retryMutation.isPending}
          isCancelling={cancelMutation.isPending}
          events={events}
          connected={connected}
        />
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        title="探索を削除"
        description={`「${exploration.title}」を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除する"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelDialogOpen(false)}
        title="探索の実行をキャンセル"
        description={`「${exploration.title}」の実行をキャンセルしますか？`}
        confirmLabel="キャンセルする"
        variant="destructive"
        isLoading={cancelMutation.isPending}
      />
    </>
  )
}
