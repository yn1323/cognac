// 探索一覧ページ
// PC: サイドバー + メインコンテンツ / SP: ヘッダー + ボディ + ボトムナビ
// タスク一覧（dashboard.tsx）と同じパターン

import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Loader,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
} from 'lucide-react'
import type { ExplorationStatus, ExplorationListItem } from '@cognac/shared'
import { Sidebar } from '@/components/sidebar'
import { PageHeader } from '@/components/page-header'
import { MetricCard } from '@/components/metric-card'
import { SPHeader } from '@/components/sp-header'
import { AppBottomNav } from '@/components/app-bottom-nav'
import { Fab } from '@/components/fab'
import { SPMetric } from '@/components/sp-metric'
import { SPTaskCard } from '@/components/sp-task-card'
import { ExplorationStatusBadge } from '@/components/exploration-status-badge'
import { Button } from '@/components/ui/button'
import { ExplorationModal } from '@/components/exploration-modal'
import { formatRelativeTime } from '@/lib/format'
import { EXPLORATION_STATUS_CONFIG } from '@/lib/exploration-status-config'
import { NAV_MAP } from '@/lib/constants'
import { cn } from '@/lib/utils'

// --- モックデータ ---

const MOCK_EXPLORATIONS: ExplorationListItem[] = [
  {
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
    hasFinalReport: false,
    latestTaskifyStatus: null,
  },
  {
    id: 2,
    title: 'ダッシュボードのパフォーマンス分析',
    request: '初期表示が遅い原因を調査し、改善方針をまとめる。',
    status: 'completed',
    final_report_markdown: '# レポート\n...',
    issue_count: 3,
    paused_reason: null,
    created_at: '2026-03-07T14:00:00Z',
    updated_at: '2026-03-07T15:30:00Z',
    started_at: '2026-03-07T14:01:00Z',
    completed_at: '2026-03-07T15:30:00Z',
    hasFinalReport: true,
    latestTaskifyStatus: 'completed',
  },
  {
    id: 3,
    title: 'APIエラーハンドリングの現状調査',
    request: '現在のエラーハンドリングの統一性を確認し、改善が必要な箇所を特定する。',
    status: 'completed',
    final_report_markdown: '# レポート\n...',
    issue_count: 5,
    paused_reason: null,
    created_at: '2026-03-06T09:00:00Z',
    updated_at: '2026-03-06T10:45:00Z',
    started_at: '2026-03-06T09:02:00Z',
    completed_at: '2026-03-06T10:45:00Z',
    hasFinalReport: true,
    latestTaskifyStatus: null,
  },
  {
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
    hasFinalReport: false,
    latestTaskifyStatus: null,
  },
  {
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
    hasFinalReport: false,
    latestTaskifyStatus: null,
  },
]

// --- フィルター定義 ---

type FilterCategory = 'pending' | 'analyzing' | 'completed' | 'failed'

const FILTER_CATEGORY_STATUSES: Record<FilterCategory, ExplorationStatus[]> = {
  pending: ['pending'],
  analyzing: ['analyzing'],
  completed: ['completed'],
  failed: ['paused', 'failed'],
}

const INITIAL_FILTERS = new Set<FilterCategory>(['pending', 'analyzing', 'completed', 'failed'])

const FILTER_STYLES: Record<
  FilterCategory,
  {
    pc: { activeBg: string; activeBorder: string; activeLabelColor: string; activeValueColor: string; activeIconColor: string }
    sp: { activeTextColor: string; activeBgColor: string; activeBorderColor: string }
  }
> = {
  analyzing: {
    pc: { activeBg: 'bg-[#eff6ff]', activeBorder: 'border-[#2563eb]', activeLabelColor: 'text-[#2563eb]', activeValueColor: 'text-[#2563eb]', activeIconColor: 'text-[#2563eb]' },
    sp: { activeTextColor: 'text-[#2563eb]', activeBgColor: 'bg-[#eff6ff]', activeBorderColor: 'border-[#2563eb]' },
  },
  completed: {
    pc: { activeBg: 'bg-[#f0fdf4]', activeBorder: 'border-[#16a34a]', activeLabelColor: 'text-[#16a34a]', activeValueColor: 'text-[#16a34a]', activeIconColor: 'text-[#16a34a]' },
    sp: { activeTextColor: 'text-[#16a34a]', activeBgColor: 'bg-[#f0fdf4]', activeBorderColor: 'border-[#16a34a]' },
  },
  pending: {
    pc: { activeBg: 'bg-[#f9fafb]', activeBorder: 'border-[#6b7280]', activeLabelColor: 'text-[#6b7280]', activeValueColor: 'text-[#374151]', activeIconColor: 'text-[#6b7280]' },
    sp: { activeTextColor: 'text-[#374151]', activeBgColor: 'bg-[#f9fafb]', activeBorderColor: 'border-[#6b7280]' },
  },
  failed: {
    pc: { activeBg: 'bg-[#fef2f2]', activeBorder: 'border-[#dc2626]', activeLabelColor: 'text-[#dc2626]', activeValueColor: 'text-[#dc2626]', activeIconColor: 'text-[#dc2626]' },
    sp: { activeTextColor: 'text-[#dc2626]', activeBgColor: 'bg-[#fef2f2]', activeBorderColor: 'border-[#dc2626]' },
  },
}

function filterExplorations(
  explorations: ExplorationListItem[],
  activeFilters: Set<FilterCategory>,
): ExplorationListItem[] {
  const allowed = new Set<ExplorationStatus>()
  for (const cat of activeFilters) {
    for (const s of FILTER_CATEGORY_STATUSES[cat]) allowed.add(s)
  }
  return explorations.filter((e) => allowed.has(e.status))
}

// --- メトリクス ---

function useMetrics(explorations: ExplorationListItem[]) {
  return useMemo(
    () =>
      explorations.reduce(
        (acc, e) => {
          if (e.status === 'pending') acc.pending++
          else if (e.status === 'analyzing') acc.analyzing++
          else if (e.status === 'completed') acc.completed++
          else if (e.status === 'paused' || e.status === 'failed') acc.failed++
          return acc
        },
        { pending: 0, analyzing: 0, completed: 0, failed: 0 },
      ),
    [explorations],
  )
}

function useExplorationFilters(explorations: ExplorationListItem[]) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterCategory>>(INITIAL_FILTERS)
  const metrics = useMetrics(explorations)
  const filtered = useMemo(() => filterExplorations(explorations, activeFilters), [explorations, activeFilters])
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
  return { activeFilters, metrics, filtered, toggle }
}

// --- 探索カード（PC版） ---

function ExplorationCard({ exploration }: { exploration: ExplorationListItem }) {
  const config = EXPLORATION_STATUS_CONFIG[exploration.status]
  return (
    <Link to={`/explorations/${exploration.id}`} className="block">
      <div
        className={cn(
          'flex gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md',
          config.borderColor,
          exploration.status === 'completed' && 'opacity-70',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <ExplorationStatusBadge status={exploration.status} />
          </div>
          <span className="text-sm font-medium leading-[1.4] text-foreground">
            {exploration.title}
          </span>
          {exploration.request && (
            <p className="line-clamp-2 text-[13px] leading-[1.4] text-muted-foreground">
              {exploration.request}
            </p>
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs leading-[1.3] text-muted-foreground">
              {formatRelativeTime(exploration.started_at ?? exploration.created_at)}
            </span>
            {exploration.issue_count > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                課題 {exploration.issue_count}件
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center self-center">
          <config.icon className={cn('h-5 w-5', config.color)} />
        </div>
      </div>
    </Link>
  )
}

// --- PC版 ---

function PCExplorationList({
  explorations,
  onNewExploration,
  onNavigate,
}: {
  explorations: ExplorationListItem[]
  onNewExploration: () => void
  onNavigate: (path: string) => void
}) {
  const { activeFilters, metrics, filtered, toggle } = useExplorationFilters(explorations)

  return (
    <div className="flex h-dvh bg-background">
      <Sidebar
        activeItem="探索"
        className="h-full shrink-0"
        onItemClick={(label) => {
          const path = NAV_MAP[label]
          if (path) onNavigate(path)
        }}
      />

      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-8">
        <PageHeader title="探索" subtitle="AI駆動の調査・検証を管理します">
          <Button variant="primary" onClick={onNewExploration}>
            <Plus className="mr-2 h-4 w-4" />
            新規探索
          </Button>
        </PageHeader>

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
            label="Analyzing"
            value={metrics.analyzing}
            icon={Loader}
            active={activeFilters.has('analyzing')}
            onClick={() => toggle('analyzing')}
            {...FILTER_STYLES.analyzing.pc}
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
            icon={XCircle}
            active={activeFilters.has('failed')}
            onClick={() => toggle('failed')}
            {...FILTER_STYLES.failed.pc}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold leading-[1.4] text-foreground">
              探索一覧
            </h2>
            <span className="text-sm text-muted-foreground">
              {filtered.length} 件
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {activeFilters.size === 0
                  ? 'フィルターを選択してね〜'
                  : '探索がまだないよ〜'}
              </p>
              {activeFilters.size > 0 && (
                <Button variant="primary" onClick={onNewExploration}>
                  <Plus className="mr-2 h-4 w-4" />
                  新規探索
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((e) => (
                <ExplorationCard key={e.id} exploration={e} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// --- SP版 ---

function SPExplorationList({
  explorations,
  onNewExploration,
  onNavigate,
  isModalOpen,
}: {
  explorations: ExplorationListItem[]
  onNewExploration: () => void
  onNavigate: (path: string) => void
  isModalOpen: boolean
}) {
  const { activeFilters, metrics, filtered, toggle } = useExplorationFilters(explorations)

  return (
    <div className="flex h-dvh flex-col bg-background">
      <SPHeader />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold leading-[1.3] text-foreground">
            探索
          </h1>
        </div>

        <div className="flex gap-2">
          <SPMetric
            value={metrics.pending}
            label="Pending"
            active={activeFilters.has('pending')}
            onClick={() => toggle('pending')}
            {...FILTER_STYLES.pending.sp}
          />
          <SPMetric
            value={metrics.analyzing}
            label="実行中"
            active={activeFilters.has('analyzing')}
            onClick={() => toggle('analyzing')}
            {...FILTER_STYLES.analyzing.sp}
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

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {activeFilters.size === 0
                ? 'フィルターを選択してね〜'
                : '探索がまだないよ〜'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((e) => {
              const config = EXPLORATION_STATUS_CONFIG[e.status]
              return (
                <Link key={e.id} to={`/explorations/${e.id}`} className="block">
                  <SPTaskCard
                    title={e.title}
                    subtitle={formatRelativeTime(e.started_at ?? e.created_at)}
                    badge={<ExplorationStatusBadge status={e.status} />}
                    borderColor={config.borderColor || 'border-border'}
                  />
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {!isModalOpen && <Fab icon={Plus} onClick={onNewExploration} />}
      <AppBottomNav activeItem="探索" />
    </div>
  )
}

// --- エクスポート ---

export function ExplorationListPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isModalOpen = searchParams.get('new-exploration') === 'true'
  const handleNew = useCallback(() => navigate('?new-exploration=true'), [navigate])

  // TODO: サーバー接続時に useExplorations() に差し替え
  const explorations = MOCK_EXPLORATIONS

  return (
    <>
      <ExplorationModal />
      <div className="hidden md:block">
        <PCExplorationList
          explorations={explorations}
          onNewExploration={handleNew}
          onNavigate={navigate}
        />
      </div>
      <div className="md:hidden">
        <SPExplorationList
          explorations={explorations}
          onNewExploration={handleNew}
          onNavigate={navigate}
          isModalOpen={isModalOpen}
        />
      </div>
    </>
  )
}
