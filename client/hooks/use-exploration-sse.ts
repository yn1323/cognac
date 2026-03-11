// 探索SSE接続フック
// useSSEの薄いラッパー。探索用イベントタイプとエンドポイントを固定

import type { ExplorationEvent } from '@cognac/shared'
import { useSSE } from './use-sse'

const EXPLORATION_EVENT_TYPES = [
  'phase_start',
  'phase_end',
  'persona_selected',
  'discussion_round_start',
  'discussion_statement',
  'discussion_round_end',
  'agent_output',
  'tool_invoked',
  'command_executed',
  'playwright_log',
  'artifact_created',
  'report_created',
  'taskify_started',
  'taskify_completed',
  'taskify_failed',
  'retry',
  'paused',
  'error',
  'completed',
] as const

const buildExplorationEndpoint = (id: number) => `/api/explorations/${id}/stream`

export function useExplorationSSE(explorationId: number | null) {
  return useSSE<ExplorationEvent>(explorationId, buildExplorationEndpoint, EXPLORATION_EVENT_TYPES)
}
