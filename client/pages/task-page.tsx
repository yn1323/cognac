// タスク詳細ページ
// URL パラメータからタスクIDを取得して詳細+ログを表示

import { useParams, Link } from 'react-router-dom'
import { useTask } from '@/hooks/use-tasks'
import { useTaskSSE } from '@/hooks/use-sse'
import { TaskDetail } from '@/components/task-detail'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function TaskPage() {
  const { id } = useParams<{ id: string }>()
  const taskId = Number(id)
  const { data: task, isLoading, error } = useTask(taskId)
  const { events, connected } = useTaskSSE(taskId)

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">読み込み中...</div>
  }

  if (error || !task) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">タスクが見つからないよ</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" />
            一覧に戻る
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link to="/">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          戻る
        </Button>
      </Link>

      <TaskDetail task={task} events={events} connected={connected} />
    </div>
  )
}
