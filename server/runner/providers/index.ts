/**
 * CLIプロバイダーファクトリー
 */

import type { CliProvider } from '@cognac/shared'
import { ClaudeProvider } from './claude-provider.js'
import { CodexProvider } from './codex-provider.js'
import type { CliProviderInterface } from './types.js'

const providers: Record<CliProvider, () => CliProviderInterface> = {
  claude: () => new ClaudeProvider(),
  codex: () => new CodexProvider(),
}

export function createProvider(type: CliProvider): CliProviderInterface {
  const resolved = type ?? 'claude'
  const factory = providers[resolved]
  if (!factory) throw new Error(`未対応のCLIプロバイダー: ${type}`)
  return factory()
}

// 型の re-export
export type {
  CliProviderInterface,
  CliResponse,
  PrintExecOptions,
  StreamExecOptions,
} from './types.js'
export { ProcessTimeoutError, TaskCancelledError } from './types.js'
