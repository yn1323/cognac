import type { CliProvider } from '@cognac/shared'

const PROVIDER_LABELS: Record<CliProvider, string> = {
  claude: 'Claude',
  codex: 'Codex',
}

export const providerLabel = (p: CliProvider): string => PROVIDER_LABELS[p]
