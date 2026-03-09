import type { ErrorType, Phase } from './events.js'
import type { ExplorationPhase } from './exploration.js'

export interface BaseLog<TPhase extends string = string> {
  id: number
  phase: TPhase
  session_id: string | null
  input_summary: string | null
  output_raw: string | null
  output_summary: string | null
  token_input: number | null
  token_output: number | null
  duration_ms: number | null
  error_type: ErrorType | null
  error_message: string | null
  created_at: string
}

export interface ExecutionLog extends BaseLog<Phase | 'retry'> {
  task_id: number
}

export interface ExplorationLog extends BaseLog<ExplorationPhase> {
  exploration_session_id: number
}
