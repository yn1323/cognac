// タスク詳細ページ
// タブ切り替えで Overview / Discussion / Plan / Logs / CI を表示
// PC: サイドバー + メインコンテンツ / SP: SPDetailHeader + ボディ

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { Task } from '@cognac/shared'
import { Sidebar } from '@/components/sidebar'
import { SPDetailHeader } from '@/components/sp-detail-header'
import { DetailTabs, type Tab } from '@/components/detail-tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTask } from '@/hooks/use-tasks'
import { formatRelativeTime } from '@/lib/format'
import { STATUS_CONFIG, STATUS_PHASE_MAP } from '@/lib/status-config'
import { PCOverviewTab, SPOverviewTab } from '@/pages/task-detail/overview-tab'
import {
  PCDiscussionTab,
  SPDiscussionTab,
} from '@/pages/task-detail/discussion-tab'
import { PCPlanTab, SPPlanTab } from '@/pages/task-detail/plan-tab'
import { PCLogsTab, SPLogsTab } from '@/pages/task-detail/logs-tab'
import { PCCITab, SPCITab } from '@/pages/task-detail/ci-tab'

// --- PC版タブボディ ---

function PCTabBody({ activeTab, task }: { activeTab: Tab; task: Task }) {
  switch (activeTab) {
    case 'Overview':
      return <PCOverviewTab task={task} />
    case 'Discussion':
      return <PCDiscussionTab />
    case 'Plan':
      return <PCPlanTab />
    case 'Logs':
      return <PCLogsTab />
    case 'CI':
      return <PCCITab />
  }
}

// --- SP版タブボディ ---

function SPTabBody({ activeTab, task }: { activeTab: Tab; task: Task }) {
  switch (activeTab) {
    case 'Overview':
      return <SPOverviewTab task={task} />
    case 'Discussion':
      return <SPDiscussionTab />
    case 'Plan':
      return <SPPlanTab />
    case 'Logs':
      return <SPLogsTab />
    case 'CI':
      return <SPCITab />
  }
}

// --- PC版 ---

const NAV_MAP: Record<string, string> = {
  Tasks: '/',
  Settings: '/settings',
}

function PCTaskDetail({
  task,
  activeTab,
  onTabChange,
  onNavigate,
}: {
  task: Task
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onNavigate: (path: string) => void
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeItem="Tasks"
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
              Tasks
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">Task #{task.id}</span>
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
                  Created {formatRelativeTime(task.created_at)}
                </span>
              </div>
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
}: {
  task: Task
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onNavigate: (path: string) => void
}) {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ヘッダー + タブ */}
      <SPDetailHeader
        title={task.title}
        subtitle={`Task #${task.id} · ${STATUS_CONFIG[task.status].label}`}
        onBack={() => onNavigate('/')}
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
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const navigate = useNavigate()

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

  return (
    <>
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCTaskDetail
          task={task}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNavigate={navigate}
        />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPTaskDetail
          task={task}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNavigate={navigate}
        />
      </div>
    </>
  )
}
