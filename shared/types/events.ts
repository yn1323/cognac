import type { Persona } from './persona.js'

// 実行フェーズ
export type Phase = 'persona' | 'discussion' | 'plan' | 'execute' | 'ci' | 'git'

// エラー種別
export type ErrorType = 'app' | 'infra' | 'process'

// CLIストリームの低レベルイベント
export type AgentStreamEvent =
  | { type: 'agent_output'; content: string }
  | { type: 'tool_invoked'; toolName: string }
  | { type: 'command_executed'; command: string; output: string; exitCode: number }
  | { type: 'file_changed'; path: string; toolName: 'Write' | 'Edit' }
  | { type: 'debug_log'; message: string; level: 'info' | 'warn' | 'error' }
  | { type: 'error'; errorType: ErrorType; message: string }

// SSEで配信されるタスクイベントの全種類
export type TaskEvent =
  // フェーズ制御
  | { type: 'phase_start'; phase: Phase; timestamp: string }
  | { type: 'phase_end'; phase: Phase; timestamp: string; durationMs: number }
  // Phase 2-A: ペルソナ選定
  | { type: 'persona_selected'; personas: Persona[] }
  // Phase 2-B: ディスカッション
  | { type: 'discussion_round_start'; round: number }
  | {
      type: 'discussion_statement'
      round: number
      personaId: string
      personaName: string
      content: string
    }
  | { type: 'discussion_round_end'; round: number; shouldContinue: boolean; reason: string }
  // Phase 2-C: プラン
  | { type: 'plan_created'; planMarkdown: string; estimatedComplexity: string }
  // Phase 3: コード実行
  | { type: 'claude_output'; content: string }
  | Extract<AgentStreamEvent, { type: 'file_changed' | 'command_executed' | 'tool_invoked' | 'debug_log' | 'error' }>
  // CI
  | { type: 'ci_start'; step: string; command: string }
  | { type: 'ci_result'; step: string; success: boolean; output: string; durationMs: number }
  // エラー・リトライ
  | { type: 'retry'; errorType: 'app' | 'process'; count: number; maxRetries: number; reason: string }
  | { type: 'paused'; reason: string; phase: Phase }
  // Git
  | { type: 'git_operation'; operation: 'checkout' | 'commit' | 'merge' | 'push'; detail: string }
  // 完了
  | {
      type: 'completed'
      summary: string
      totalDurationMs: number
      tokenUsage: { input: number; output: number }
    }

// 実行ログ（BaseLogから派生）
export type { ExecutionLog } from './log.js'

// CIステップ
export interface CiStep {
  name: string
  command: string
}

// CIキャッシュ
export interface CiCache {
  id: number
  steps: string // JSON: CiStep[]
  config_hash: string
  detected_at: string
}
