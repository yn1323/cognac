// タスクのステータス
export type TaskStatus =
  | 'pending'
  | 'discussing'
  | 'planned'
  | 'executing'
  | 'testing'
  | 'completed'
  | 'paused'
  | 'stopped'

// タスク
export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: number
  queue_order: number | null
  branch_name: string | null
  retry_count: number
  process_retry_count: number
  paused_reason: string | null
  paused_phase: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

// Priority ラベル ↔ 数値のマッピング
export const PRIORITY_MAP = { Low: 0, Normal: 1, High: 2, Urgent: 3 } as const
export type PriorityLabel = keyof typeof PRIORITY_MAP

// タスク作成の入力
export interface CreateTaskInput {
  title: string
  description?: string
  priority?: number // 0=Low, 1=Normal, 2=High, 3=Urgent
}

// タスク更新の入力
export interface UpdateTaskInput {
  title?: string
  description?: string
  priority?: number
  queue_order?: number
}

// タスク添付画像
export interface TaskImage {
  id: number
  task_id: number
  file_path: string
  original_name: string
  mime_type: string
  created_at: string
}
