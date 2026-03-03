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
        <Route element={<Layout />}>
          <Route path="/tasks/:id" element={<TaskPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
