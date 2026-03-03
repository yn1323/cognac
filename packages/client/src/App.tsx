// アプリケーションルート
// ルーティングとレイアウトの定義

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { HomePage } from '@/pages/home'
import { TaskPage } from '@/pages/task-page'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/tasks/:id" element={<TaskPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
