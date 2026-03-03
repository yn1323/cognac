// タスク詳細ページ — 概要タブ
// デザイン design.pen PC=9d5bz, SP=lNPXJ に準拠

import { Check, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// --- モックデータ ---

const MOCK_TASK = {
  id: 7,
  title: 'Implement user authentication with JWT',
  status: 'discussing' as const,
  phase: 'Phase 2-B: Multi-Persona Discussion',
  branch: 'task/7-implement-jwt-auth',
  created: '2026-03-03 14:32',
  description:
    'JWT認証を実装する。ログイン・ログアウト・トークンリフレッシュのAPIエンドポイントを作成し、ミドルウェアでの認証チェックも含む。Zustandでの認証状態管理とProtectedRouteコンポーネントも実装する。',
}

const MOCK_PERSONAS = [
  {
    name: 'Security Engineer',
    desc: '認証・セキュリティ設計の専門家',
    color: '#7c3aed',
  },
  {
    name: 'Frontend Engineer',
    desc: 'React / UI実装の専門家',
    color: '#2563eb',
  },
  {
    name: 'Test Engineer',
    desc: 'テスト設計・品質保証の専門家',
    color: '#ea580c',
  },
]

interface ProgressStep {
  label: string
  sub: string
  status: 'completed' | 'active' | 'waiting'
  number?: number
}

const MOCK_PROGRESS: ProgressStep[] = [
  {
    label: 'Phase 2-A: Persona Selection',
    sub: '3 personas selected — Completed',
    status: 'completed',
  },
  {
    label: 'Phase 2-B: Multi-Persona Discussion',
    sub: 'Round 1 of 3 — In progress',
    status: 'active',
  },
  {
    label: 'Phase 2-C: Plan Confirmation',
    sub: 'Waiting',
    status: 'waiting',
    number: 3,
  },
  {
    label: 'Phase 3: Code Execution',
    sub: 'Waiting',
    status: 'waiting',
    number: 4,
  },
]

// --- 共通パーツ ---

function ProgressStepItem({
  step,
  size = 'md',
}: {
  step: ProgressStep
  size?: 'md' | 'sm'
}) {
  const iconSize = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
  const checkSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const dotSize = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
  const titleClass = 'text-[13px]'
  const subClass = 'text-xs'

  return (
    <div className="flex items-center gap-3">
      {step.status === 'completed' && (
        <div
          className={cn(
            iconSize,
            'flex shrink-0 items-center justify-center rounded-full bg-[#16a34a]',
          )}
        >
          <Check className={cn(checkSize, 'text-white')} />
        </div>
      )}
      {step.status === 'active' && (
        <div
          className={cn(
            iconSize,
            'flex shrink-0 items-center justify-center rounded-full bg-[#eab308]',
          )}
        >
          <div className={cn(dotSize, 'rounded-full bg-white')} />
        </div>
      )}
      {step.status === 'waiting' && (
        <div
          className={cn(
            iconSize,
            'flex shrink-0 items-center justify-center rounded-full bg-muted',
          )}
        >
          <span className="text-xs font-semibold text-muted-foreground">
            {step.number}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        <span
          className={cn(
            titleClass,
            'font-semibold leading-[1.4]',
            step.status === 'waiting'
              ? 'font-medium text-muted-foreground'
              : 'text-foreground',
          )}
        >
          {step.label}
        </span>
        <span
          className={cn(
            subClass,
            'leading-[1.4]',
            step.status === 'active'
              ? 'font-medium text-[#eab308]'
              : 'text-muted-foreground',
          )}
        >
          {step.sub}
        </span>
      </div>
    </div>
  )
}

// --- PC版 ---

export function PCOverviewTab() {
  return (
    <div className="flex flex-col gap-6">
      {/* Task Information カード */}
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Task Information
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-[120px] shrink-0 text-[13px] font-medium text-muted-foreground">
              Status
            </span>
            <Badge variant="discussing">Discussing</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[120px] shrink-0 text-[13px] font-medium text-muted-foreground">
              Current Phase
            </span>
            <span className="text-[13px] text-foreground">
              {MOCK_TASK.phase}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[120px] shrink-0 text-[13px] font-medium text-muted-foreground">
              Branch
            </span>
            <span className="text-[13px] text-[#2563eb]">
              {MOCK_TASK.branch}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[120px] shrink-0 text-[13px] font-medium text-muted-foreground">
              Created
            </span>
            <span className="text-[13px] text-foreground">
              {MOCK_TASK.created}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-muted-foreground">
              Description
            </span>
            <p className="text-[13px] leading-[1.6] text-foreground">
              {MOCK_TASK.description}
            </p>
          </div>
        </div>
      </Card>

      {/* Selected Personas */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-foreground">
          Selected Personas
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {MOCK_PERSONAS.map((persona) => (
            <Card key={persona.name} className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: persona.color }}
                >
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {persona.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {persona.desc}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Task Progress */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-foreground">
          Task Progress
        </h2>
        <Card className="p-6">
          <div className="flex flex-col gap-5">
            {MOCK_PROGRESS.map((step) => (
              <ProgressStepItem key={step.label} step={step} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// --- SP版 ---

export function SPOverviewTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* Task Information */}
      <Card className="p-4">
        <h3 className="mb-3 text-[15px] font-semibold text-foreground">
          Task Information
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
              Status
            </span>
            <Badge variant="discussing">Discussing</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
              Phase
            </span>
            <span className="text-xs text-foreground">2-B: Discussion</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
              Branch
            </span>
            <span className="text-xs text-[#2563eb]">task/7-jwt-auth</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Description
            </span>
            <p className="text-xs leading-[1.5] text-foreground">
              JWT認証を実装。ログイン・ログアウト・token refreshのAPIを作成。
            </p>
          </div>
        </div>
      </Card>

      {/* Personas */}
      <Card className="p-4">
        <h3 className="mb-3 text-[15px] font-semibold text-foreground">
          Personas
        </h3>
        <div className="flex flex-col gap-3">
          {MOCK_PERSONAS.map((persona) => (
            <div key={persona.name} className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: persona.color }}
              >
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[13px] font-medium text-foreground">
                {persona.name}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Progress */}
      <Card className="p-4">
        <h3 className="mb-3 text-[15px] font-semibold text-foreground">
          Progress
        </h3>
        <div className="flex flex-col gap-2.5">
          {MOCK_PROGRESS.map((step) => (
            <ProgressStepItem key={step.label} step={step} size="sm" />
          ))}
        </div>
      </Card>
    </div>
  )
}
