// タスク詳細ページ
// タブ切り替えで Overview / Discussion / Plan / Logs / CI を表示
// PC: サイドバー + メインコンテンツ / SP: SPDetailHeader + ボディ

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  EllipsisVertical,
  Loader2,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react'
import type { Task } from '@cognac/shared'
import { EditTaskModal } from '@/components/edit-task-modal'
import { useToast } from '@/components/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Sidebar } from '@/components/sidebar'
import { SPDetailHeader } from '@/components/sp-detail-header'
import { DetailTabs, type Tab } from '@/components/detail-tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useTask, useDeleteTask, useCancelTask } from '@/hooks/use-tasks'
import { formatRelativeTime } from '@/lib/format'
import { DELETABLE_STATUSES, STATUS_CONFIG, STATUS_PHASE_MAP } from '@/lib/status-config'
import { PCOverviewTab, SPOverviewTab } from '@/pages/task-detail/overview-tab'
import {
  PCDiscussionTab,
  SPDiscussionTab,
} from '@/pages/task-detail/discussion-tab'
import { PCPlanTab, SPPlanTab } from '@/pages/task-detail/plan-tab'
import { PCLogsTab, SPLogsTab } from '@/pages/task-detail/logs-tab'
import { PCCITab, SPCITab } from '@/pages/task-detail/ci-tab'

// --- アクション用props ---

interface TaskActions {
  onEditOpen: () => void
  onDelete: () => void
  onCancel: () => void
  canDelete: boolean
  isDeleting: boolean
  isCancelling: boolean
}

// --- PC版タブボディ ---

function PCTabBody({ activeTab, task }: { activeTab: Tab; task: Task }) {
  switch (activeTab) {
    case '概要':
      return <PCOverviewTab task={task} />
    case 'ディスカッション':
      return <PCDiscussionTab />
    case 'プラン':
      return <PCPlanTab />
    case 'ログ':
      return <PCLogsTab />
    case 'CI':
      return <PCCITab />
  }
}

// --- SP版タブボディ ---

function SPTabBody({ activeTab, task }: { activeTab: Tab; task: Task }) {
  switch (activeTab) {
    case '概要':
      return <SPOverviewTab task={task} />
    case 'ディスカッション':
      return <SPDiscussionTab />
    case 'プラン':
      return <SPPlanTab />
    case 'ログ':
      return <SPLogsTab />
    case 'CI':
      return <SPCITab />
  }
}

// --- PC版 ---

const NAV_MAP: Record<string, string> = {
  タスク: '/',
  設定: '/settings',
}

function PCTaskDetail({
  task,
  activeTab,
  onTabChange,
  onNavigate,
  actions,
}: {
  task: Task
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onNavigate: (path: string) => void
  actions: TaskActions
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeItem="タスク"
        onItemClick={(label) => {
          const path = NAV_MAP[label]
          if (path) onNavigate(path)
        }}
        className="h-full shrink-0"
      />

      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-8">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          {/* パンくずリスト */}
          <div className="flex items-center gap-1.5 text-[13px]">
            <button
              type="button"
              className="text-[#2563eb] hover:underline"
              onClick={() => onNavigate('/')}
            >
              タスク
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">タスク #{task.id}</span>
          </div>

          {/* タイトル行 */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-[22px] font-semibold leading-[1.3] text-foreground">
                {task.title}
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant={task.status}>
                  {STATUS_CONFIG[task.status].label}
                </Badge>
                <span className="text-[13px] text-muted-foreground">
                  {STATUS_PHASE_MAP[task.status]}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  作成 {formatRelativeTime(task.created_at)}
                </span>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center gap-2">
              {task.status === 'executing' ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={actions.onCancel}
                  disabled={actions.isCancelling}
                >
                  キャンセル
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={actions.onEditOpen}
                  >
                    編集
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={actions.onDelete}
                    disabled={!actions.canDelete || actions.isDeleting}
                  >
                    削除
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* タブバー */}
        <DetailTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          variant="pc"
        />

        {/* タブボディ */}
        <PCTabBody activeTab={activeTab} task={task} />
      </main>
    </div>
  )
}

// --- SP版 ---

function SPTaskDetail({
  task,
  activeTab,
  onTabChange,
  onNavigate,
  actions,
}: {
  task: Task
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onNavigate: (path: string) => void
  actions: TaskActions
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ヘッダー + タブ */}
      <SPDetailHeader
        title={task.title}
        subtitle={`タスク #${task.id} · ${STATUS_CONFIG[task.status].label}`}
        onBack={() => onNavigate('/')}
        actions={
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
            {task.status === 'executing' ? (
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false)
                  actions.onCancel()
                }}
                variant="destructive"
                icon={XCircle}
              >
                キャンセル
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setMenuOpen(false)
                    actions.onEditOpen()
                  }}
                  icon={Pencil}
                >
                  編集
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setMenuOpen(false)
                    actions.onDelete()
                  }}
                  variant="destructive"
                  icon={Trash2}
                  disabled={!actions.canDelete}
                >
                  削除
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
        }
      >
        <DetailTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          variant="sp"
        />
      </SPDetailHeader>

      {/* ボディ */}
      <main className="flex flex-1 flex-col overflow-y-auto p-4">
        <SPTabBody activeTab={activeTab} task={task} />
      </main>
    </div>
  )
}

// --- エクスポート ---

export function TaskPage() {
  const { id } = useParams<{ id: string }>()
  const taskId = Number(id)
  const { data: task, isLoading, error } = useTask(taskId)
  const [activeTab, setActiveTab] = useState<Tab>('概要')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const deleteTask = useDeleteTask()
  const cancelTask = useCancelTask()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          タスクの取得に失敗しました
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          ダッシュボードに戻る
        </Button>
      </div>
    )
  }

  const canDelete = DELETABLE_STATUSES.has(task.status)

  const handleDelete = () => setDeleteDialogOpen(true)

  const handleConfirmDelete = () => {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast('タスクを削除しました', 'success')
        navigate('/')
      },
      onError: () => {
        toast('タスクの削除に失敗しました', 'error')
        setDeleteDialogOpen(false)
      },
    })
  }

  const handleCancel = () => setCancelDialogOpen(true)

  const handleConfirmCancel = () => {
    cancelTask.mutate(task.id, {
      onSuccess: () => {
        toast('タスクの実行をキャンセルしました', 'success')
        setCancelDialogOpen(false)
      },
      onError: () => {
        toast('タスクのキャンセルに失敗しました', 'error')
        setCancelDialogOpen(false)
      },
    })
  }

  const actions: TaskActions = {
    onEditOpen: () => setEditOpen(true),
    onDelete: handleDelete,
    onCancel: handleCancel,
    canDelete,
    isDeleting: deleteTask.isPending,
    isCancelling: cancelTask.isPending,
  }

  return (
    <>
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCTaskDetail
          task={task}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNavigate={navigate}
          actions={actions}
        />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPTaskDetail
          task={task}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNavigate={navigate}
          actions={actions}
        />
      </div>

      {/* 編集モーダル（PC/SP共通で1つだけレンダリング） */}
      <EditTaskModal
        task={task}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        title="タスクを削除"
        description={`「${task.title}」を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除する"
        variant="destructive"
        isLoading={deleteTask.isPending}
      />

      {/* キャンセル確認ダイアログ */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelDialogOpen(false)}
        title="実行をキャンセル"
        description={`「${task.title}」の実行をキャンセルしますか？`}
        confirmLabel="キャンセルする"
        variant="destructive"
        isLoading={cancelTask.isPending}
      />
    </>
  )
}
