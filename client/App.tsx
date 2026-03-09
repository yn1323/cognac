// アプリケーションルート
// ルーティングとレイアウトの定義

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { DashboardPage } from '@/pages/dashboard'
import { SettingsPage } from '@/pages/settings'
import { TaskPage } from '@/pages/task-page'
import { GitPage } from '@/pages/git'
import { ConsolePage } from '@/pages/console'
import { ExplorationListPage } from '@/pages/exploration-list'
import { ExplorationDetailPage } from '@/pages/exploration-detail'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ダッシュボードは独自レイアウト（サイドバー / SP BottomNav） */}
        <Route index element={<DashboardPage />} />
        {/* 設定画面も独自レイアウト（サイドバー / SPシンプルヘッダー） */}
        <Route path="/settings" element={<SettingsPage />} />
        {/* タスク詳細も独自レイアウト（サイドバー / SPDetailHeader） */}
        <Route path="/tasks/:id" element={<TaskPage />} />
        {/* 探索一覧ページ */}
        <Route path="/explorations" element={<ExplorationListPage />} />
        {/* 探索詳細ページ */}
        <Route path="/explorations/:id" element={<ExplorationDetailPage />} />
        {/* Git操作ページ */}
        <Route path="/git" element={<GitPage />} />
        {/* コンソールページ */}
        <Route path="/console" element={<ConsolePage />} />
        <Route element={<Layout />}>{/* 将来の共通レイアウトページ */}</Route>
      </Routes>
    </BrowserRouter>
  )
}
