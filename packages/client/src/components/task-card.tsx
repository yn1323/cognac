// タスクカード
// タスク一覧で表示するカード。タップで詳細ページへ遷移する

import { Link } from 'react-router-dom'
import type { Task } from '@solitary-coding/shared'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function TaskCard({ task }: { task: Task }) {
  return (
    <Link to={`/tasks/${task.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="truncate pr-2">{task.title}</CardTitle>
          <StatusBadge status={task.status} />
        </CardHeader>
        <CardContent>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(task.created_at)}</span>
            {task.retry_count > 0 && (
              <span className="text-orange-600">リトライ {task.retry_count}回</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
