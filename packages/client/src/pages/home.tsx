// タスク一覧ページ
// タスク追加フォーム + タスクリスト

import { TaskForm } from '@/components/task-form'
import { TaskList } from '@/components/task-list'

export function HomePage() {
  return (
    <div className="space-y-6">
      <TaskForm />
      <TaskList />
    </div>
  )
}
