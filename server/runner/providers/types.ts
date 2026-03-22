/**
 * CLIプロバイダー共通型定義
 *
 * Claude CLI / Codex CLI 共通のインターフェース、オプション型、エラークラスを定義する。
 */

import type { AgentStreamEvent, CognacConfig } from '@cognac/shared'

// ── プロバイダー共通レスポンス ──

export interface CliResponse {
  result: string
  sessionId: string
  usage: { inputTokens: number; outputTokens: number }
  durationMs: number
}

// ── 実行オプション ──

/** ストリーム実行オプション（Phase 3 コード実行用） */
export interface StreamExecOptions {
  prompt: string
  systemPrompt?: string
  sessionId?: string
  maxTurns?: number
  executionMode?: 'write' | 'read-only'
  allowedTools?: string[]
  dangerouslySkipPermissions?: boolean
  onStream?: (event: AgentStreamEvent) => void
  signal?: AbortSignal
}

/** テキスト出力オプション（Phase 2 ディスカッション + Git AI用） */
export type PrintExecOptions = Omit<
  StreamExecOptions,
  'allowedTools' | 'dangerouslySkipPermissions' | 'onStream' | 'maxTurns'
>

// ── プロバイダーインターフェース ──

export interface CliProviderInterface {
  /** プロバイダー名 */
  readonly name: string

  /** ストリーミングモード実行（Phase 3: コード実行） */
  execStream(options: StreamExecOptions, config: CognacConfig): Promise<CliResponse>

  /** テキスト出力モード実行（Phase 2: ディスカッション/プラン + Git AI） */
  execPrint(options: PrintExecOptions, config: CognacConfig): Promise<CliResponse>
}

// ── エラークラス（claude-caller.ts から移動） ──

/**
 * プロセスタイムアウト用エラー
 * 呼び出し元で errorType: 'process' として扱うためのマーカー。
 */
export class ProcessTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`CLIプロセスが ${timeoutMs}ms 応答なしでタイムアウトした`)
    this.name = 'ProcessTimeoutError'
  }
}

/**
 * タスクキャンセル用エラー
 * ユーザーがキャンセルしたときに発生するマーカー。
 */
export class TaskCancelledError extends Error {
  constructor() {
    super('ユーザーによるキャンセル')
    this.name = 'TaskCancelledError'
  }
}

/**
 * CLIプロバイダー実行失敗エラー
 * exit code非ゼロ、またはストリーム中にレートリミット等を検知した場合にthrowする。
 */
export class CliProviderError extends Error {
  readonly exitCode: number
  readonly stderr: string
  readonly partialResult?: string
  readonly isRateLimit: boolean

  constructor(opts: {
    exitCode: number
    stderr: string
    partialResult?: string
    isRateLimit?: boolean
  }) {
    super(`CLIプロセスが exit code ${opts.exitCode} で失敗: ${opts.stderr.slice(0, 200)}`)
    this.name = 'CliProviderError'
    this.exitCode = opts.exitCode
    this.stderr = opts.stderr
    this.partialResult = opts.partialResult
    // 明示的に渡されなければstderrから自動判定
    this.isRateLimit = opts.isRateLimit ?? /rate.limit|429|too many requests/i.test(opts.stderr)
  }
}
