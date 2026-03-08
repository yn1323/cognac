// 探索詳細ページ
// タブ切り替えで 概要 / ディスカッション / ログ / レポート を表示
// PC: サイドバー + メインコンテンツ / SP: SPDetailHeader + ボディ
// タスク詳細（task-page.tsx）と同じパターン

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  EllipsisVertical,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import type { ExplorationSession } from '@cognac/shared'
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
  EXPLORATION_DELETABLE_STATUSES,
  EXPLORATION_RETRYABLE_STATUSES,
} from '@/lib/exploration-status-config'
import { PCOverviewTab, SPOverviewTab } from '@/pages/exploration-detail/overview-tab'
import { PCDiscussionTab, SPDiscussionTab } from '@/pages/exploration-detail/discussion-tab'
import { PCLogsTab, SPLogsTab } from '@/pages/exploration-detail/logs-tab'
import { PCReportTab, SPReportTab } from '@/pages/exploration-detail/report-tab'

// --- モックデータ ---

const MOCK_EXPLORATIONS: Record<number, ExplorationSession> = {
  1: {
    id: 1,
    title: 'ログインフォームの使いやすさを検証',
    request: 'ログインフォームのUXを検証し、改善ポイントをまとめてほしい。特にモバイル端末での入力しやすさを重視。',
    status: 'analyzing',
    final_report_markdown: null,
    issue_count: 0,
    paused_reason: null,
    created_at: '2026-03-08T10:00:00Z',
    updated_at: '2026-03-08T10:05:00Z',
    started_at: '2026-03-08T10:01:00Z',
    completed_at: null,
  },
  2: {
    id: 2,
    title: 'ダッシュボードのパフォーマンス分析',
    request: '初期表示が遅い原因を調査し、改善方針をまとめる。PlaywrightでLighthouseスコアも取得してほしい。',
    status: 'completed',
    final_report_markdown: '# パフォーマンス分析レポート\n...',
    issue_count: 3,
    paused_reason: null,
    created_at: '2026-03-07T14:00:00Z',
    updated_at: '2026-03-07T15:30:00Z',
    started_at: '2026-03-07T14:01:00Z',
    completed_at: '2026-03-07T15:30:00Z',
  },
  3: {
    id: 3,
    title: 'APIエラーハンドリングの現状調査',
    request: '現在のエラーハンドリングの統一性を確認し、改善が必要な箇所を特定する。',
    status: 'completed',
    final_report_markdown: '# エラーハンドリング調査\n...',
    issue_count: 5,
    paused_reason: null,
    created_at: '2026-03-06T09:00:00Z',
    updated_at: '2026-03-06T10:45:00Z',
    started_at: '2026-03-06T09:02:00Z',
    completed_at: '2026-03-06T10:45:00Z',
  },
  4: {
    id: 4,
    title: 'モバイルレスポンシブの確認',
    request: '各画面のモバイル表示を確認し、崩れている箇所をリストアップする。',
    status: 'pending',
    final_report_markdown: null,
    issue_count: 0,
    paused_reason: null,
    created_at: '2026-03-08T11:00:00Z',
    updated_at: '2026-03-08T11:00:00Z',
    started_at: null,
    completed_at: null,
  },
  5: {
    id: 5,
    title: 'セキュリティヘッダーの設定確認',
    request: 'レスポンスヘッダーのセキュリティ設定を確認し、不足している項目を洗い出す。',
    status: 'failed',
    final_report_markdown: null,
    issue_count: 0,
    paused_reason: null,
    created_at: '2026-03-05T16:00:00Z',
    updated_at: '2026-03-05T16:20:00Z',
    started_at: '2026-03-05T16:01:00Z',
    completed_at: null,
  },
}

// --- タブボディ ---

function PCTabBody({ activeTab, exploration }: { activeTab: ExplorationTab; exploration: ExplorationSession }) {
  switch (activeTab) {
    case '概要':
      return <PCOverviewTab exploration={exploration} />
    case 'ディスカッション':
      return <PCDiscussionTab exploration={exploration} />
    case 'ログ':
      return <PCLogsTab exploration={exploration} />
    case 'レポート':
      return <PCReportTab exploration={exploration} />
  }
}

function SPTabBody({ activeTab, exploration }: { activeTab: ExplorationTab; exploration: ExplorationSession }) {
  switch (activeTab) {
    case '概要':
      return <SPOverviewTab exploration={exploration} />
    case 'ディスカッション':
      return <SPDiscussionTab exploration={exploration} />
    case 'ログ':
      return <SPLogsTab exploration={exploration} />
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
  canDelete,
  canRetry,
}: {
  exploration: ExplorationSession
  activeTab: ExplorationTab
  onTabChange: (tab: ExplorationTab) => void
  onNavigate: (path: string) => void
  onDelete: () => void
  onRetry: () => void
  canDelete: boolean
  canRetry: boolean
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
              {canRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  リトライ
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={onDelete}>
                  削除
                </Button>
              )}
            </div>
          </div>
        </div>

        <ExplorationTabs activeTab={activeTab} onTabChange={onTabChange} variant="pc" />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <PCTabBody activeTab={activeTab} exploration={exploration} />
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
  canDelete,
  canRetry,
}: {
  exploration: ExplorationSession
  activeTab: ExplorationTab
  onTabChange: (tab: ExplorationTab) => void
  onNavigate: (path: string) => void
  onDelete: () => void
  onRetry: () => void
  canDelete: boolean
  canRetry: boolean
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
          (canDelete || canRetry) ? (
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
              {canRetry && (
                <DropdownMenuItem
                  onClick={() => {
                    setMenuOpen(false)
                    onRetry()
                  }}
                  icon={RefreshCw}
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
          <SPTabBody activeTab={activeTab} exploration={exploration} />
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
  const [activeTab, setActiveTab] = useState<ExplorationTab>('概要')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // TODO: サーバー接続時に useExploration(explorationId) に差し替え
  const exploration = MOCK_EXPLORATIONS[explorationId]

  if (!exploration) {
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

  const canDelete = EXPLORATION_DELETABLE_STATUSES.has(exploration.status)
  const canRetry = EXPLORATION_RETRYABLE_STATUSES.has(exploration.status)

  const handleDelete = () => setDeleteDialogOpen(true)
  const handleConfirmDelete = () => {
    // TODO: サーバー接続時にAPI呼び出しに差し替え
    console.log('探索削除:', exploration.id)
    toast('探索を削除しました', 'success')
    navigate('/explorations')
  }

  const handleRetry = () => {
    // TODO: サーバー接続時にAPI呼び出しに差し替え
    console.log('探索リトライ:', exploration.id)
    toast('探索をリトライキューに戻しました', 'success')
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
          canDelete={canDelete}
          canRetry={canRetry}
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
          canDelete={canDelete}
          canRetry={canRetry}
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
      />
    </>
  )
}
