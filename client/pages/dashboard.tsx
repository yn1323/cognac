// ダッシュボードページ
// PC: サイドバー + メインコンテンツ / SP: ヘッダー + ボディ + ボトムナビ
// デザイン design.pen PC=EUZoe, SP=S77Vv に準拠

import type { Task, TaskStatus } from '@cognac/shared'
import {
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  Pause,
  Plus,
  PlusCircle,
  ListChecks,
  Settings,
  Loader2,
} from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { PageHeader } from '@/components/page-header'
import { MetricCard } from '@/components/metric-card'
import { TaskCard } from '@/components/task-card'
import { SPHeader } from '@/components/sp-header'
import { SPBottomNav, SPNavItem } from '@/components/sp-bottom-nav'
import { SPMetric } from '@/components/sp-metric'
import { SPTaskCard } from '@/components/sp-task-card'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TaskModal } from '@/components/task-modal'
import { formatRelativeTime } from '@/lib/format'
import { RETRYABLE_STATUSES, STATUS_CONFIG } from '@/lib/status-config'
import { NAV_MAP } from '@/lib/constants'
import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useMemo, useState } from 'react'
import { useToast } from '@/components/toast'
import { useTasks, useRetryTask } from '@/hooks/use-tasks'

// --- フィルター定義 ---

type FilterCategory = 'pending' | 'executing' | 'completed' | 'failed'

const FILTER_CATEGORY_STATUSES: Record<FilterCategory, TaskStatus[]> = {
  pending: ['pending'],
  executing: ['discussing', 'planned', 'executing', 'testing'],
  completed: ['completed'],
  failed: ['paused', 'stopped'],
}

const INITIAL_FILTERS = new Set<FilterCategory>(['pending', 'executing', 'failed'])

/** カテゴリごとのactive時スタイル（デザイン design.pen PC=KCxvr, SP=DK6dH 準拠） */
const FILTER_STYLES: Record<
  FilterCategory,
  {
    pc: { activeBg: string; activeBorder: string; activeLabelColor: string; activeValueColor: string; activeIconColor: string }
    sp: { activeTextColor: string; activeBgColor: string; activeBorderColor: string }
  }
> = {
  pending: {
    pc: { activeBg: 'bg-[#f9fafb]', activeBorder: 'border-[#6b7280]', activeLabelColor: 'text-[#6b7280]', activeValueColor: 'text-[#374151]', activeIconColor: 'text-[#6b7280]' },
    sp: { activeTextColor: 'text-[#374151]', activeBgColor: 'bg-[#f9fafb]', activeBorderColor: 'border-[#6b7280]' },
  },
  executing: {
    pc: { activeBg: 'bg-[#eff6ff]', activeBorder: 'border-[#2563eb]', activeLabelColor: 'text-[#2563eb]', activeValueColor: 'text-[#2563eb]', activeIconColor: 'text-[#2563eb]' },
    sp: { activeTextColor: 'text-[#2563eb]', activeBgColor: 'bg-[#eff6ff]', activeBorderColor: 'border-[#2563eb]' },
  },
  completed: {
    pc: { activeBg: 'bg-[#f0fdf4]', activeBorder: 'border-[#16a34a]', activeLabelColor: 'text-[#16a34a]', activeValueColor: 'text-[#16a34a]', activeIconColor: 'text-[#16a34a]' },
    sp: { activeTextColor: 'text-[#16a34a]', activeBgColor: 'bg-[#f0fdf4]', activeBorderColor: 'border-[#16a34a]' },
  },
  failed: {
    pc: { activeBg: 'bg-[#fef2f2]', activeBorder: 'border-[#dc2626]', activeLabelColor: 'text-[#dc2626]', activeValueColor: 'text-[#dc2626]', activeIconColor: 'text-[#dc2626]' },
    sp: { activeTextColor: 'text-[#dc2626]', activeBgColor: 'bg-[#fef2f2]', activeBorderColor: 'border-[#dc2626]' },
  },
}

function filterTasks(tasks: Task[], activeFilters: Set<FilterCategory>): Task[] {
  const allowedStatuses = new Set<TaskStatus>()
  for (const cat of activeFilters) {
    for (const s of FILTER_CATEGORY_STATUSES[cat]) allowedStatuses.add(s)
  }
  return tasks.filter((t) => allowedStatuses.has(t.status))
}

// --- メトリクス計算 ---

function useMetrics(tasks: Task[]) {
  return useMemo(
    () =>
      tasks.reduce(
        (acc, t) => {
          if (t.status === 'pending') acc.pending++
          else if (t.status === 'executing') acc.executing++
          else if (t.status === 'completed') acc.completed++
          else if (t.status === 'stopped' || t.status === 'paused') acc.failed++
          return acc
        },
        { pending: 0, executing: 0, completed: 0, failed: 0 },
      ),
    [tasks],
  )
}

// --- フィルターフック（PC/SP共通） ---

function useDashboardFilters(tasks: Task[]) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterCategory>>(INITIAL_FILTERS)
  const metrics = useMetrics(tasks)
  const filteredTasks = useMemo(() => filterTasks(tasks, activeFilters), [tasks, activeFilters])
  const toggle = useCallback(
    (cat: FilterCategory) =>
      setActiveFilters((prev) => {
        const next = new Set(prev)
        if (next.has(cat)) next.delete(cat)
        else next.add(cat)
        return next
      }),
    [],
  )
  return { activeFilters, metrics, filteredTasks, toggle }
}

// --- SP用ヘルパー ---

function getSPSubtitle(task: Task): string {
  const time = formatRelativeTime(task.started_at ?? task.created_at)
  if (task.status === 'executing') return `Phase 3 Executing · ${time}`
  if (task.status === 'discussing') return `Discussing · ${time}`
  if (task.status === 'stopped' && task.retry_count > 0)
    return `CI失敗 (${task.retry_count}/5) · ${time}`
  return time
}

function getSPBorderColor(task: Task): string {
  return STATUS_CONFIG[task.status].borderColor || 'border-border'
}

// --- 共通Props ---

interface DashboardProps {
  tasks: Task[]
  isLoading: boolean
  error: Error | null
  onNewTask: () => void
  onNavigate: (path: string) => void
  onRetry: (taskId: number) => void
}

// --- PC版 ---

function PCDashboard({ tasks, isLoading, error, onNewTask, onNavigate, onRetry }: DashboardProps) {
  const { activeFilters, metrics, filteredTasks, toggle } = useDashboardFilters(tasks)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        className="h-full shrink-0"
        onItemClick={(label) => {
          const path = NAV_MAP[label]
          if (path) onNavigate(path)
        }}
      />

      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-8">
        {/* ページヘッダー */}
        <PageHeader
          title="タスク"
          subtitle="AI駆動の開発タスクを管理・監視します"
        >
          {/* Runner Status */}
          <div className="flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            <span className="text-xs font-semibold text-[#166534]">実行中</span>
          </div>
          <Button variant="outline">
            <Pause className="mr-2 h-4 w-4" />
            全停止
          </Button>
          <Button
            variant="primary"
            onClick={onNewTask}
          >
            <Plus className="mr-2 h-4 w-4" />
            新規タスク
          </Button>
        </PageHeader>

        {/* メトリクスカード（フィルター兼用） */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Pending"
            value={metrics.pending}
            icon={Clock}
            active={activeFilters.has('pending')}
            onClick={() => toggle('pending')}
            {...FILTER_STYLES.pending.pc}
          />
          <MetricCard
            label="Executing"
            value={metrics.executing}
            icon={Play}
            active={activeFilters.has('executing')}
            onClick={() => toggle('executing')}
            {...FILTER_STYLES.executing.pc}
          />
          <MetricCard
            label="Completed"
            value={metrics.completed}
            icon={CheckCircle}
            active={activeFilters.has('completed')}
            onClick={() => toggle('completed')}
            {...FILTER_STYLES.completed.pc}
          />
          <MetricCard
            label="Failed"
            value={metrics.failed}
            icon={AlertCircle}
            active={activeFilters.has('failed')}
            onClick={() => toggle('failed')}
            {...FILTER_STYLES.failed.pc}
          />
        </div>

        {/* タスクリストセクション */}
        <div className="flex flex-col gap-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold leading-[1.4] text-foreground">
              タスクキュー
            </h2>
            <span className="text-sm text-muted-foreground">
              {filteredTasks.length} 件
            </span>
          </div>

          {/* タスクカード */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">
                タスクの取得に失敗しました
              </p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {activeFilters.size === 0
                  ? 'フィルターを選択してね〜'
                  : 'タスクがまだないよ〜'}
              </p>
              {activeFilters.size === 0 ? null : (
                <Button
                  variant="primary"
                  onClick={onNewTask}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新規タスク
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} onRetry={onRetry} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// --- SP版 ---

function SPDashboard({ tasks, isLoading, error, onNewTask, onNavigate, onRetry }: DashboardProps) {
  const { activeFilters, metrics, filteredTasks, toggle } = useDashboardFilters(tasks)

  return (
    <div className="flex h-screen flex-col bg-background">
      <SPHeader />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* タイトル + Running バッジ */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold leading-[1.3] text-foreground">
            タスク
          </h1>
          <Badge className="bg-[#16a34a] text-white">実行中</Badge>
        </div>

        {/* メトリクス（フィルター兼用） */}
        <div className="flex gap-2">
          <SPMetric
            value={metrics.pending}
            label="Pending"
            active={activeFilters.has('pending')}
            onClick={() => toggle('pending')}
            {...FILTER_STYLES.pending.sp}
          />
          <SPMetric
            value={metrics.executing}
            label="実行"
            active={activeFilters.has('executing')}
            onClick={() => toggle('executing')}
            {...FILTER_STYLES.executing.sp}
          />
          <SPMetric
            value={metrics.completed}
            label="完了"
            active={activeFilters.has('completed')}
            onClick={() => toggle('completed')}
            {...FILTER_STYLES.completed.sp}
          />
          <SPMetric
            value={metrics.failed}
            label="失敗"
            active={activeFilters.has('failed')}
            onClick={() => toggle('failed')}
            {...FILTER_STYLES.failed.sp}
          />
        </div>

        {/* タスクカード */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              タスクの取得に失敗しました
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {activeFilters.size === 0
                ? 'フィルターを選択してね〜'
                : 'タスクがまだないよ〜'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredTasks.map((task) => (
              <Link key={task.id} to={`/tasks/${task.id}`} className="block">
                <SPTaskCard
                  title={task.title}
                  subtitle={getSPSubtitle(task)}
                  badge={<StatusBadge status={task.status} />}
                  borderColor={getSPBorderColor(task)}
                  actions={
                    RETRYABLE_STATUSES.has(task.status) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto px-2.5 py-1 text-xs"
                        onClick={(e) => {
                          e.preventDefault()
                          onRetry(task.id)
                        }}
                      >
                        リトライ
                      </Button>
                    ) : undefined
                  }
                />
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* ボトムナビ */}
      <SPBottomNav>
        <SPNavItem icon={ListChecks} label="タスク" active />
        <button
          type="button"
          className="flex flex-col items-center gap-1"
          onClick={onNewTask}
        >
          <PlusCircle className="h-7 w-7 text-primary" />
        </button>
        <SPNavItem icon={Settings} label="設定" onClick={() => onNavigate('/settings')} />
      </SPBottomNav>
    </div>
  )
}

// --- エクスポート ---

export function DashboardPage() {
  const navigate = useNavigate()
  const handleNewTask = useCallback(() => navigate('?new-task=true'), [navigate])
  const { data: tasks = [], isLoading, error } = useTasks()
  const retryTask = useRetryTask()
  const { toast } = useToast()
  const handleRetry = useCallback((taskId: number) => {
    retryTask.mutate(taskId, {
      onSuccess: () => toast('タスクをリトライキューに戻しました', 'success'),
      onError: () => toast('リトライに失敗しました', 'error'),
    })
  }, [retryTask, toast])

  return (
    <>
      <TaskModal />
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCDashboard
          tasks={tasks}
          isLoading={isLoading}
          error={error}
          onNewTask={handleNewTask}
          onNavigate={navigate}
          onRetry={handleRetry}
        />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPDashboard
          tasks={tasks}
          isLoading={isLoading}
          error={error}
          onNewTask={handleNewTask}
          onNavigate={navigate}
          onRetry={handleRetry}
        />
      </div>
    </>
  )
}
