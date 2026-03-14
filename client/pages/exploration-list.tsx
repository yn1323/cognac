// 探索一覧ページ
// PC: サイドバー + メインコンテンツ / SP: ヘッダー + ボディ + ボトムナビ
// タスク一覧（dashboard.tsx）と同じパターン

import type { ExplorationListItem, ExplorationStatus } from '@cognac/shared'
import { CheckCircle, Clock, Loader, Plus, XCircle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppBottomNav } from '@/components/app-bottom-nav'
import { ExplorationModal } from '@/components/exploration-modal'
import { Fab } from '@/components/fab'
import { MetricCard } from '@/components/metric-card'
import { PageHeader } from '@/components/page-header'
import { Sidebar } from '@/components/sidebar'
import { SPHeader } from '@/components/sp-header'
import { SPMetric } from '@/components/sp-metric'
import { SPTaskCard } from '@/components/sp-task-card'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { useElapsedTime } from '@/hooks/use-elapsed-time'
import { useExplorations, useRetryExploration } from '@/hooks/use-explorations'
import { NAV_MAP } from '@/lib/constants'
import {
  EXPLORATION_RETRYABLE_STATUSES,
  EXPLORATION_STATUS_CONFIG,
} from '@/lib/exploration-status-config'
import { formatDuration, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

// --- フィルター定義 ---

type FilterCategory = 'pending' | 'executing' | 'completed' | 'failed'

const FILTER_CATEGORY_STATUSES: Record<FilterCategory, ExplorationStatus[]> = {
  pending: ['pending'],
  executing: ['discussing', 'executing', 'reviewing'],
  completed: ['completed'],
  failed: ['paused', 'stopped'],
}

const INITIAL_FILTERS = new Set<FilterCategory>(['pending', 'executing', 'completed', 'failed'])

const FILTER_STYLES: Record<
  FilterCategory,
  {
    pc: {
      activeBg: string
      activeBorder: string
      activeLabelColor: string
      activeValueColor: string
      activeIconColor: string
    }
    sp: { activeTextColor: string; activeBgColor: string; activeBorderColor: string }
  }
> = {
  executing: {
    pc: {
      activeBg: 'bg-[#eff6ff]',
      activeBorder: 'border-[#2563eb]',
      activeLabelColor: 'text-[#2563eb]',
      activeValueColor: 'text-[#2563eb]',
      activeIconColor: 'text-[#2563eb]',
    },
    sp: {
      activeTextColor: 'text-[#2563eb]',
      activeBgColor: 'bg-[#eff6ff]',
      activeBorderColor: 'border-[#2563eb]',
    },
  },
  completed: {
    pc: {
      activeBg: 'bg-[#f0fdf4]',
      activeBorder: 'border-[#16a34a]',
      activeLabelColor: 'text-[#16a34a]',
      activeValueColor: 'text-[#16a34a]',
      activeIconColor: 'text-[#16a34a]',
    },
    sp: {
      activeTextColor: 'text-[#16a34a]',
      activeBgColor: 'bg-[#f0fdf4]',
      activeBorderColor: 'border-[#16a34a]',
    },
  },
  pending: {
    pc: {
      activeBg: 'bg-[#f9fafb]',
      activeBorder: 'border-[#6b7280]',
      activeLabelColor: 'text-[#6b7280]',
      activeValueColor: 'text-[#374151]',
      activeIconColor: 'text-[#6b7280]',
    },
    sp: {
      activeTextColor: 'text-[#374151]',
      activeBgColor: 'bg-[#f9fafb]',
      activeBorderColor: 'border-[#6b7280]',
    },
  },
  failed: {
    pc: {
      activeBg: 'bg-[#fef2f2]',
      activeBorder: 'border-[#dc2626]',
      activeLabelColor: 'text-[#dc2626]',
      activeValueColor: 'text-[#dc2626]',
      activeIconColor: 'text-[#dc2626]',
    },
    sp: {
      activeTextColor: 'text-[#dc2626]',
      activeBgColor: 'bg-[#fef2f2]',
      activeBorderColor: 'border-[#dc2626]',
    },
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
          else if (
            e.status === 'discussing' ||
            e.status === 'executing' ||
            e.status === 'reviewing'
          )
            acc.executing++
          else if (e.status === 'completed') acc.completed++
          else if (e.status === 'paused' || e.status === 'stopped') acc.failed++
          return acc
        },
        { pending: 0, executing: 0, completed: 0, failed: 0 },
      ),
    [explorations],
  )
}

function useExplorationFilters(explorations: ExplorationListItem[]) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterCategory>>(INITIAL_FILTERS)
  const metrics = useMetrics(explorations)
  const filtered = useMemo(
    () => filterExplorations(explorations, activeFilters),
    [explorations, activeFilters],
  )
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

function ExplorationCard({
  exploration,
  onRetry,
}: {
  exploration: ExplorationListItem
  onRetry?: (id: number) => void
}) {
  const config = EXPLORATION_STATUS_CONFIG[exploration.status]
  const elapsedMs = useElapsedTime(exploration.started_at, exploration.completed_at)
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
            <ExplorationCardBadge exploration={exploration} />
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
            {elapsedMs != null && (
              <span className="text-xs leading-[1.3] text-muted-foreground">
                · ⏱ {formatDuration(elapsedMs)}
              </span>
            )}
          </div>
        </div>
        {EXPLORATION_RETRYABLE_STATUSES.has(exploration.status) && (
          <Button
            variant="outline"
            size="sm"
            className="h-auto self-center px-2.5 py-1 text-xs"
            onClick={(e) => {
              e.preventDefault()
              onRetry?.(exploration.id)
            }}
          >
            リトライ
          </Button>
        )}
        <div className="flex flex-col items-center self-center">
          <config.icon className={cn('h-5 w-5', config.color)} />
        </div>
      </div>
    </Link>
  )
}

function ExplorationCardBadge({ exploration }: { exploration: ExplorationListItem }) {
  const config = EXPLORATION_STATUS_CONFIG[exploration.status]

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5', config.bgColor)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotColor)} />
      <span className={cn('text-xs font-medium leading-[1.3]', config.color)}>{config.label}</span>
    </span>
  )
}

// --- PC版 ---

function PCExplorationList({
  explorations,
  onNewExploration,
  onNavigate,
  onRetry,
}: {
  explorations: ExplorationListItem[]
  onNewExploration: () => void
  onNavigate: (path: string) => void
  onRetry: (id: number) => void
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
            label="Executing"
            value={metrics.executing}
            icon={Loader}
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
            icon={XCircle}
            active={activeFilters.has('failed')}
            onClick={() => toggle('failed')}
            {...FILTER_STYLES.failed.pc}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold leading-[1.4] text-foreground">探索一覧</h2>
            <span className="text-sm text-muted-foreground">{filtered.length} 件</span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {activeFilters.size === 0 ? 'フィルターを選択してね〜' : '探索がまだないよ〜'}
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
                <ExplorationCard key={e.id} exploration={e} onRetry={onRetry} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// --- SP用ラッパー ---

function SPExplorationCardItem({
  exploration,
  onRetry,
}: {
  exploration: ExplorationListItem
  onRetry: (id: number) => void
}) {
  const config = EXPLORATION_STATUS_CONFIG[exploration.status]
  const elapsedMs = useElapsedTime(exploration.started_at, exploration.completed_at)
  const time = formatRelativeTime(exploration.started_at ?? exploration.created_at)
  const elapsed = elapsedMs != null ? ` · ⏱ ${formatDuration(elapsedMs)}` : ''
  const subtitle = `${time}${elapsed}`

  return (
    <Link to={`/explorations/${exploration.id}`} className="block">
      <SPTaskCard
        title={exploration.title}
        subtitle={subtitle}
        badge={<ExplorationCardBadge exploration={exploration} />}
        borderColor={config.borderColor || 'border-border'}
        actions={
          EXPLORATION_RETRYABLE_STATUSES.has(exploration.status) ? (
            <Button
              variant="outline"
              size="sm"
              className="h-auto px-2.5 py-1 text-xs"
              onClick={(ev) => {
                ev.preventDefault()
                onRetry(exploration.id)
              }}
            >
              リトライ
            </Button>
          ) : undefined
        }
      />
    </Link>
  )
}

// --- SP版 ---

function SPExplorationList({
  explorations,
  onNewExploration,
  onNavigate: _onNavigate,
  onRetry,
  isModalOpen,
}: {
  explorations: ExplorationListItem[]
  onNewExploration: () => void
  onNavigate: (path: string) => void
  onRetry: (id: number) => void
  isModalOpen: boolean
}) {
  const { activeFilters, metrics, filtered, toggle } = useExplorationFilters(explorations)

  return (
    <div className="flex h-dvh flex-col bg-background">
      <SPHeader />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold leading-[1.3] text-foreground">探索</h1>
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
            value={metrics.executing}
            label="実行中"
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

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {activeFilters.size === 0 ? 'フィルターを選択してね〜' : '探索がまだないよ〜'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((e) => (
              <SPExplorationCardItem key={e.id} exploration={e} onRetry={onRetry} />
            ))}
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

  const { data: explorations = [] } = useExplorations()
  const retryMutation = useRetryExploration()
  const { toast } = useToast()

  const handleRetry = (id: number) => {
    retryMutation.mutate(id, {
      onSuccess: () => toast('探索を最初から再実行する状態に戻しました', 'success'),
      onError: (err) => toast(err.message, 'error'),
    })
  }

  return (
    <>
      <ExplorationModal />
      <div className="hidden md:block">
        <PCExplorationList
          explorations={explorations}
          onNewExploration={handleNew}
          onNavigate={navigate}
          onRetry={handleRetry}
        />
      </div>
      <div className="md:hidden">
        <SPExplorationList
          explorations={explorations}
          onNewExploration={handleNew}
          onNavigate={navigate}
          onRetry={handleRetry}
          isModalOpen={isModalOpen}
        />
      </div>
    </>
  )
}
