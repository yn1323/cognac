/**
 * B-06: Claude Code CLIの呼び出しヘルパー（ファサード）
 *
 * 後方互換のため既存の関数名を維持しつつ、
 * 実装は ClaudeProvider に委譲する。
 */

import type { CognacConfig } from '@cognac/shared'
import { ClaudeProvider } from './providers/claude-provider.js'
import type { CliResponse, StreamExecOptions, PrintExecOptions } from './providers/types.js'

// エラークラスの re-export（既存の import を壊さないため）
export { ProcessTimeoutError, TaskCancelledError } from './providers/types.js'

// 型の re-export（既存の import を壊さないため）
export type { StreamExecOptions as CallClaudeOptions } from './providers/types.js'
export type { PrintExecOptions as CallClaudePrintOptions } from './providers/types.js'
export type { CliResponse as ClaudeResponse } from './providers/types.js'

const claude = new ClaudeProvider()

export async function callClaude(
  options: StreamExecOptions,
  config: CognacConfig,
): Promise<CliResponse> {
  return claude.execStream(options, config)
}

export async function callClaudePrint(
  options: PrintExecOptions,
  config: CognacConfig,
): Promise<CliResponse> {
  return claude.execPrint(options, config)
}

export function getCleanEnv(): NodeJS.ProcessEnv {
  return claude.getCleanEnv()
}
