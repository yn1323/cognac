export type ExplorationStatus =
  | 'pending'
  | 'discussing'
  | 'executing'
  | 'reviewing'
  | 'completed'
  | 'paused'
  | 'stopped'

export type ExplorationPhase =
  | 'persona'
  | 'discussion'
  | 'explore'
  | 'report'
  | 'taskify'

export type ExplorationArtifactKind =
  | 'plan'
  | 'finding'
  | 'playwright-log'
  | 'report'
  | 'taskify-result'

export type ExplorationImageSourceType = 'user' | 'playwright'

export type ExplorationTaskifyJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'

export interface ExplorationSession {
  id: number
  title: string
  request: string
  status: ExplorationStatus
  final_report_markdown: string | null
  issue_count: number
  paused_reason: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
}

export interface ExplorationListItem extends ExplorationSession {
  hasFinalReport: boolean
  latestTaskifyStatus: ExplorationTaskifyJobStatus | null
}

export interface CreateExplorationInput {
  title: string
  request: string
}

export interface ExplorationImage {
  id: number
  exploration_session_id: number
  source_type: ExplorationImageSourceType
  file_path: string
  original_name: string | null
  mime_type: string
  created_at: string
}

export interface ExplorationPersona {
  id: number
  exploration_session_id: number
  persona_id: string
  name: string
  focus: string
  tone: string
  created_at: string
}

export interface ExplorationDiscussion {
  id: number
  exploration_session_id: number
  round: number
  persona_id: string
  persona_name: string
  content: string
  key_points: string | null
  should_continue: boolean
  continue_reason: string | null
  created_at: string
}

export interface ExplorationArtifact {
  id: number
  exploration_session_id: number
  kind: ExplorationArtifactKind
  title: string | null
  content_text: string | null
  file_path: string | null
  metadata_json: string | null
  created_at: string
}

// 探索ログ（BaseLogから派生）
export type { ExplorationLog } from './log.js'

export interface ExplorationTaskifyJob {
  id: number
  exploration_session_id: number
  status: ExplorationTaskifyJobStatus
  result_json: string | null
  error_message: string | null
  requested_at: string
  started_at: string | null
  completed_at: string | null
}

export interface ExplorationFindingResult {
  title: string
  detail: string
  severity?: 'low' | 'medium' | 'high'
}

export interface ExplorationExecutionResult {
  summary: string
  findings: ExplorationFindingResult[]
  nextActions: string[]
  evidenceFiles: string[]
  playwrightUsed: boolean
}

export interface ExplorationReportResult {
  reportMarkdown: string
  findings: ExplorationFindingResult[]
  nextActions: string[]
}

export interface ExplorationTaskifyResult {
  tasks: {
    title: string
    description: string
    priority: number
    selectedImageIds: number[]
    sourceFindingTitles: string[]
  }[]
}

export type ExplorationEvent =
  | { type: 'phase_start'; phase: ExplorationPhase; timestamp: string }
  | { type: 'phase_end'; phase: ExplorationPhase; timestamp: string; durationMs: number }
  | { type: 'persona_selected'; personas: ExplorationPersona[] }
  | { type: 'discussion_round_start'; round: number }
  | {
      type: 'discussion_statement'
      round: number
      personaId: string
      personaName: string
      content: string
    }
  | { type: 'discussion_round_end'; round: number; shouldContinue: boolean; reason: string }
  | { type: 'agent_output'; content: string }
  | { type: 'tool_invoked'; toolName: string }
  | { type: 'command_executed'; command: string; output: string; exitCode: number }
  | { type: 'playwright_log'; message: string }
  | { type: 'artifact_created'; kind: ExplorationArtifactKind; title?: string; path?: string }
  | { type: 'report_created'; issueCount: number }
  | { type: 'taskify_started'; jobId: number }
  | { type: 'taskify_completed'; jobId: number; taskIds: number[] }
  | { type: 'taskify_failed'; jobId: number; message: string }
  | { type: 'retry'; errorType: 'app' | 'process'; count: number; maxRetries: number; reason: string }
  | { type: 'paused'; reason: string; phase: ExplorationPhase }
  | { type: 'error'; errorType: 'app' | 'infra' | 'process'; message: string; phase?: ExplorationPhase }
  | { type: 'completed'; summary: string; totalDurationMs: number }
