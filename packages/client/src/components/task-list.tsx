// タスク一覧コンポーネント
// 全タスクをカードで表示する

import { useTasks } from '@/hooks/use-tasks'
import { TaskCard } from '@/components/task-card'

export function TaskList() {
  const { data: tasks, isLoading, error } = useTasks()

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">読み込み中...</div>
  }

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        エラー: {error.message}
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        タスクがないよ。上のフォームから追加してね
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
