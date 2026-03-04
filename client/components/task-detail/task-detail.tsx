// タスク詳細表示
// 概要情報 + 実行ログ

import { useState } from 'react'
import type { Task, TaskEvent } from '@cognac/shared'
import { StatusBadge } from '@/components/status-badge'
import { LogView } from '@/components/log-view'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDeleteTask } from '@/hooks/use-tasks'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { DELETABLE_STATUSES } from '@/lib/status-config'

export function TaskDetail({
  task,
  events,
  connected,
}: {
  task: Task
  events: TaskEvent[]
  connected: boolean
}) {
  const deleteTask = useDeleteTask()
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const canDelete = DELETABLE_STATUSES.has(task.status)

  const handleDelete = () => {
    deleteTask.mutate(task.id, {
      onSuccess: () => navigate('/'),
      onError: () => setShowDeleteConfirm(false),
    })
  }

  return (
    <div className="space-y-4">
      {/* 概要 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">{task.title}</CardTitle>
          <StatusBadge status={task.status} />
        </CardHeader>
        <CardContent className="space-y-3">
          {task.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>作成: {formatDateTime(task.created_at)}</div>
            <div>開始: {formatDateTime(task.started_at)}</div>
            <div>完了: {formatDateTime(task.completed_at)}</div>
            <div>リトライ: {task.retry_count}回</div>
          </div>

          {task.branch_name && (
            <div className="text-xs font-mono bg-muted rounded px-2 py-1">
              {task.branch_name}
            </div>
          )}

          {task.paused_reason && (
            <div className="text-sm text-destructive bg-red-50 rounded p-2">
              {task.paused_reason}
            </div>
          )}

          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteTask.isPending}
            >
              <Trash2 className="h-4 w-4" />
              削除
            </Button>
          )}

          <ConfirmDialog
            open={showDeleteConfirm}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            title={`「${task.title}」を削除する？`}
            description="この操作は取り消せません。タスクに関連するすべてのデータが削除されます。"
            confirmLabel="削除する"
            variant="destructive"
            isLoading={deleteTask.isPending}
          />
        </CardContent>
      </Card>

      {/* 実行ログ */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>実行ログ</CardTitle>
          {connected && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              接続中
            </span>
          )}
        </CardHeader>
        <CardContent>
          <LogView events={events} />
        </CardContent>
      </Card>
    </div>
  )
}
