// タスク詳細ページ
// タブ切り替えで Overview / Discussion / Plan / Logs / CI を表示
// PC: サイドバー + メインコンテンツ / SP: SPDetailHeader + ボディ

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar'
import { SPDetailHeader } from '@/components/sp-detail-header'
import { DetailTabs, type Tab } from '@/components/detail-tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PCOverviewTab, SPOverviewTab } from '@/pages/task-detail/overview-tab'
import {
  PCDiscussionTab,
  SPDiscussionTab,
} from '@/pages/task-detail/discussion-tab'
import { PCPlanTab, SPPlanTab } from '@/pages/task-detail/plan-tab'
import { PCLogsTab, SPLogsTab } from '@/pages/task-detail/logs-tab'
import { PCCITab, SPCITab } from '@/pages/task-detail/ci-tab'

// --- モックデータ ---

const MOCK_TASK = {
  id: 7,
  title: 'Implement user authentication with JWT',
  status: 'discussing' as const,
  phase: 'Phase 2-B: Multi-Persona Discussion',
}

// --- PC版タブボディ ---

function PCTabBody({ activeTab }: { activeTab: Tab }) {
  switch (activeTab) {
    case 'Overview':
      return <PCOverviewTab />
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

function SPTabBody({ activeTab }: { activeTab: Tab }) {
  switch (activeTab) {
    case 'Overview':
      return <SPOverviewTab />
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

function PCTaskDetail({ activeTab, onTabChange, onNavigate }: { activeTab: Tab; onTabChange: (tab: Tab) => void; onNavigate: (path: string) => void }) {
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
            <span className="text-[#2563eb]">Tasks</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">
              Task #{MOCK_TASK.id}
            </span>
          </div>

          {/* タイトル行 */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-[22px] font-semibold leading-[1.3] text-foreground">
                {MOCK_TASK.title}
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant="discussing">Discussing</Badge>
                <span className="text-[13px] text-muted-foreground">
                  {MOCK_TASK.phase}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  Created 15 min ago
                </span>
              </div>
            </div>
            <Button variant="destructive">Cancel</Button>
          </div>
        </div>

        {/* タブバー */}
        <DetailTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          variant="pc"
        />

        {/* タブボディ */}
        <PCTabBody activeTab={activeTab} />
      </main>
    </div>
  )
}

// --- SP版 ---

function SPTaskDetail({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ヘッダー + タブ */}
      <SPDetailHeader
        title="Implement JWT auth"
        subtitle={`Task #${MOCK_TASK.id} · Discussing`}
        onBack={() => {}}
      >
        <DetailTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          variant="sp"
        />
      </SPDetailHeader>

      {/* ボディ */}
      <main className="flex flex-1 flex-col overflow-y-auto p-4">
        <SPTabBody activeTab={activeTab} />
      </main>
    </div>
  )
}

// --- エクスポート ---

export function TaskPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const navigate = useNavigate()

  return (
    <>
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCTaskDetail activeTab={activeTab} onTabChange={setActiveTab} onNavigate={navigate} />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPTaskDetail activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  )
}
