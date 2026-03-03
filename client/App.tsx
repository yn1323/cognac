// アプリケーションルート
// ルーティングとレイアウトの定義

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { DashboardPage } from '@/pages/dashboard'
import { TaskPage } from '@/pages/task-page'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ダッシュボードは独自レイアウト（サイドバー / SP BottomNav） */}
        <Route index element={<DashboardPage />} />
        {/* タスク詳細も独自レイアウト（サイドバー / SPDetailHeader） */}
        <Route path="/tasks/:id" element={<TaskPage />} />
        <Route element={<Layout />}>{/* 将来の共通レイアウトページ */}</Route>
      </Routes>
    </BrowserRouter>
  )
}
