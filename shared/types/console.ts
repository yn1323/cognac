export type ConsoleRunStatus =
  | 'starting'
  | 'running'
  | 'stopping'
  | 'completed'
  | 'failed'
  | 'killed'

export interface ConsoleCommand {
  id: number
  name: string
  command: string
  note: string | null
  created_at: string
  updated_at: string
}

export interface ConsoleRun {
  id: number
  command_id: number
  status: ConsoleRunStatus
  pid: number | null
  started_at: string
  ended_at: string | null
  exit_code: number | null
  termination_reason: string | null
  log_file_path: string
  created_at: string
}

export interface ConsoleCommandListItem extends ConsoleCommand {
  latest_run: ConsoleRun | null
  active_run: ConsoleRun | null
  derived_status: 'idle' | ConsoleRunStatus
}

export interface ConsoleLogResponse {
  run: ConsoleRun
  content: string
  truncated: boolean
  size: number
}

export interface CreateConsoleCommandInput {
  name: string
  command: string
  note?: string
}

export interface UpdateConsoleCommandInput {
  name?: string
  command?: string
  note?: string
}

export type ConsoleStreamEvent =
  | { type: 'run_started'; runId: number; commandId: number; pid: number | null; timestamp: string }
  | {
      type: 'run_status_changed'
      runId: number
      commandId: number
      status: ConsoleRunStatus
      timestamp: string
    }
  | {
      type: 'run_output'
      runId: number
      commandId: number
      stream: 'stdout' | 'stderr'
      chunk: string
      timestamp: string
    }
  | {
      type: 'run_exit'
      runId: number
      commandId: number
      status: 'completed' | 'failed' | 'killed'
      exitCode: number | null
      timestamp: string
    }
  | {
      type: 'run_log_truncated'
      runId: number
      commandId: number
      message: string
      timestamp: string
    }
