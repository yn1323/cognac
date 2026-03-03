// ダッシュボードページ
// PC: サイドバー + メインコンテンツ / SP: ヘッダー + ボディ + ボトムナビ
// デザイン design.pen PC=EUZoe, SP=S77Vv に準拠

import type { Task } from '@cognac/shared'
import {
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  Pause,
  Plus,
  PlusCircle,
  LayoutDashboard,
  ListChecks,
  Terminal,
  Settings,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { PageHeader } from '@/components/page-header'
import { MetricCard } from '@/components/metric-card'
import { TaskCard } from '@/components/task-card'
import { SPHeader } from '@/components/sp-header'
import { SPBottomNav, SPNavItem } from '@/components/sp-bottom-nav'
import { SPMetric } from '@/components/sp-metric'
import { SPTaskCard } from '@/components/sp-task-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// --- 固定データ ---

const MOCK_TASKS: Task[] = [
  {
    id: 1,
    title: 'Implement user authentication with JWT',
    description: 'JWT認証を実装。リフレッシュトークンとCSRF対策も含む',
    status: 'executing',
    priority: 1,
    queue_order: 1,
    branch_name: 'task/1-implement-jwt-auth',
    retry_count: 0,
    process_retry_count: 0,
    paused_reason: null,
    paused_phase: null,
    created_at: '2026-03-03T14:00:00Z',
    started_at: '2026-03-03T14:30:00Z',
    completed_at: null,
  },
  {
    id: 2,
    title: 'Add drag-and-drop task reordering',
    description: 'キューの並べ替え機能。タッチ対応のD&Dライブラリを使う',
    status: 'discussing',
    priority: 2,
    queue_order: 2,
    branch_name: null,
    retry_count: 0,
    process_retry_count: 0,
    paused_reason: null,
    paused_phase: null,
    created_at: '2026-03-03T14:20:00Z',
    started_at: '2026-03-03T14:27:00Z',
    completed_at: null,
  },
  {
    id: 3,
    title: 'Implement SSE event streaming',
    description: 'SSEでリアルタイムにタスク実行状況を配信する',
    status: 'pending',
    priority: 3,
    queue_order: 3,
    branch_name: null,
    retry_count: 0,
    process_retry_count: 0,
    paused_reason: null,
    paused_phase: null,
    created_at: '2026-03-03T14:22:00Z',
    started_at: null,
    completed_at: null,
  },
  {
    id: 4,
    title: 'Set up Hono backend with SQLite',
    description: 'HonoサーバーとSQLite DBの初期セットアップ',
    status: 'completed',
    priority: 4,
    queue_order: null,
    branch_name: 'task/4-setup-hono-sqlite',
    retry_count: 0,
    process_retry_count: 0,
    paused_reason: null,
    paused_phase: null,
    created_at: '2026-03-03T13:00:00Z',
    started_at: '2026-03-03T13:05:00Z',
    completed_at: '2026-03-03T13:50:00Z',
  },
  {
    id: 5,
    title: 'Add error classification system',
    description: 'エラー分類（アプリ/インフラ/プロセス）の実装',
    status: 'stopped',
    priority: 5,
    queue_order: null,
    branch_name: 'task/5-error-classification',
    retry_count: 5,
    process_retry_count: 0,
    paused_reason: null,
    paused_phase: null,
    created_at: '2026-03-03T14:02:00Z',
    started_at: '2026-03-03T14:02:00Z',
    completed_at: null,
  },
]

// --- PC版 ---

function PCDashboard() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="h-full shrink-0" />

      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-8">
        {/* ページヘッダー */}
        <PageHeader
          title="Tasks"
          subtitle="Manage and monitor your AI-driven development tasks"
        >
          {/* Runner Status */}
          <div className="flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            <span className="text-xs font-semibold text-[#166534]">Running</span>
          </div>
          <Button variant="outline">
            <Pause className="mr-2 h-4 w-4" />
            Pause All
          </Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </PageHeader>

        {/* メトリクスカード */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard label="Pending" value={5} icon={Clock} />
          <MetricCard
            label="Executing"
            value={1}
            icon={Play}
            className="[&_svg]:text-[#2563eb]"
          />
          <MetricCard
            label="Completed"
            value={12}
            icon={CheckCircle}
            className="[&_svg]:text-[#16a34a]"
          />
          <MetricCard
            label="Failed"
            value={2}
            icon={AlertCircle}
            className="[&_svg]:text-destructive"
          />
        </div>

        {/* タスクリストセクション */}
        <div className="flex flex-col gap-4">
          {/* ヘッダー */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold leading-[1.4] text-foreground">
                Task Queue
              </h2>
              <span className="text-sm text-muted-foreground">20 tasks</span>
            </div>

            {/* フィルタータブ */}
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-[13px] font-medium text-foreground bg-muted"
              >
                All
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
              >
                Active
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
              >
                Completed
              </button>
            </div>
          </div>

          {/* タスクカード */}
          <div className="flex flex-col gap-2">
            {MOCK_TASKS.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// --- SP版 ---

function SPDashboard() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <SPHeader />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* タイトル + Running バッジ */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold leading-[1.3] text-foreground">
            Tasks
          </h1>
          <Badge className="bg-[#16a34a] text-white">Running</Badge>
        </div>

        {/* メトリクス */}
        <div className="flex gap-2">
          <SPMetric value={5} label="Pending" />
          <SPMetric
            value={1}
            label="Exec"
            textColor="text-[#2563eb]"
            bgColor="bg-[#eff6ff]"
            borderColor="border-[#2563eb30]"
          />
          <SPMetric
            value={12}
            label="Done"
            textColor="text-[#16a34a]"
            bgColor="bg-[#f0fdf4]"
            borderColor="border-[#16a34a30]"
          />
          <SPMetric
            value={2}
            label="Stop"
            textColor="text-[#dc2626]"
            bgColor="bg-[#fef2f2]"
            borderColor="border-[#dc262630]"
          />
        </div>

        {/* タスクカード */}
        <div className="flex flex-col gap-2.5">
          <SPTaskCard
            title="Implement auth API"
            subtitle="Phase 3 · 14:32 started"
            badge={
              <Badge className="bg-[#2563eb] text-white">Executing</Badge>
            }
            borderColor="border-[#2563eb] border-2"
          />
          <SPTaskCard
            title="Add drag-and-drop reorder"
            subtitle="Round 2 of 3 · 3 personas"
            badge={
              <Badge className="bg-[#eab308] text-white">Discussing</Badge>
            }
          />
          <SPTaskCard
            title="Setup SSE endpoints"
            subtitle="Queued · Created 14:10"
            badge={
              <Badge variant="secondary">Pending</Badge>
            }
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-auto px-2 py-1 text-xs">
                  <ChevronUp className="mr-1 h-3 w-3" />
                  Up
                </Button>
                <Button variant="outline" size="sm" className="h-auto px-2 py-1 text-xs">
                  <ChevronDown className="mr-1 h-3 w-3" />
                  Down
                </Button>
              </div>
            }
          />
          <SPTaskCard
            title="Add error classification"
            subtitle="CI failed (5/5) · 30 min ago"
            badge={
              <Badge className="bg-[#ef4444] text-white">Stopped</Badge>
            }
            borderColor="border-[#ef444440]"
            actions={
              <Button variant="outline" size="sm" className="h-auto px-2.5 py-1 text-xs">
                Retry
              </Button>
            }
          />
        </div>
      </main>

      {/* ボトムナビ */}
      <SPBottomNav>
        <SPNavItem icon={ListChecks} label="Tasks" active />
        <button type="button" className="flex flex-col items-center gap-1">
          <PlusCircle className="h-7 w-7 text-primary" />
        </button>
        <SPNavItem icon={Settings} label="Settings" />
      </SPBottomNav>
    </div>
  )
}

// --- エクスポート ---

export function DashboardPage() {
  return (
    <>
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCDashboard />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPDashboard />
      </div>
    </>
  )
}
