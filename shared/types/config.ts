import type { CiStep } from './events.js'

// Git設定
export interface GitConfig {
  defaultBranch: string
}

// CI設定
export interface CiConfig {
  maxRetries: number
  steps?: CiStep[]
}

// ディスカッション設定
export interface DiscussionConfig {
  maxRounds: number
  minPersonas: number
  maxPersonas: number
}

// Claude Code実行設定
export interface ClaudeConfig {
  maxTurnsExecution: number
  maxTurnsDiscussion: number
  stdoutTimeoutMs: number
  processMaxRetries: number
}

// 全体設定
export interface SolitaryCodingConfig {
  port: number
  git: GitConfig
  ci: CiConfig
  discussion: DiscussionConfig
  claude: ClaudeConfig
}

// デフォルト設定値
const defaultConfig: SolitaryCodingConfig = {
  port: 4000,
  git: {
    defaultBranch: 'main',
  },
  ci: {
    maxRetries: 5,
  },
  discussion: {
    maxRounds: 3,
    minPersonas: 2,
    maxPersonas: 4,
  },
  claude: {
    maxTurnsExecution: 30,
    maxTurnsDiscussion: 1,
    stdoutTimeoutMs: 300000,
    processMaxRetries: 2,
  },
}

// 設定ファイルのヘルパー関数
export function defineConfig(config: Partial<SolitaryCodingConfig>): SolitaryCodingConfig {
  return {
    ...defaultConfig,
    ...config,
    git: { ...defaultConfig.git, ...config.git },
    ci: { ...defaultConfig.ci, ...config.ci },
    discussion: { ...defaultConfig.discussion, ...config.discussion },
    claude: { ...defaultConfig.claude, ...config.claude },
  }
}
