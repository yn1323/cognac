// タスクSSE接続フック
// useSSEの薄いラッパー。タスク用イベントタイプとエンドポイントを固定

import type { TaskEvent } from '@cognac/shared'
import { useSSE } from './use-sse'

const TASK_EVENT_TYPES = [
  'phase_start',
  'phase_end',
  'persona_selected',
  'discussion_round_start',
  'discussion_statement',
  'discussion_round_end',
  'plan_created',
  'claude_output',
  'file_changed',
  'command_executed',
  'tool_invoked',
  'ci_start',
  'ci_result',
  'retry',
  'error',
  'paused',
  'git_operation',
  'completed',
  'debug_log',
] as const

const buildTaskEndpoint = (id: number) => `/api/tasks/${id}/stream`

export function useTaskSSE(taskId: number | null) {
  return useSSE<TaskEvent>(taskId, buildTaskEndpoint, TASK_EVENT_TYPES)
}
