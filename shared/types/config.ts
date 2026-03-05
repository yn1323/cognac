import type { CiStep } from './events.js'

// 設定更新ペイロード（API用）
export interface SettingsPayload {
  ci: {
    maxRetries: number
    steps: CiStep[] // 空配列 = 自動検出モード
  }
}

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
  skipDiscussion: boolean // true=ブートストラップモード（Phase 2スキップ）
}

// Claude Code実行設定
export interface ClaudeConfig {
  maxTurnsExecution: number
  maxTurnsDiscussion: number
  stdoutTimeoutMs: number
  processMaxRetries: number
}

// 全体設定
export interface CognacConfig {
  port: number
  git: GitConfig
  ci: CiConfig
  discussion: DiscussionConfig
  claude: ClaudeConfig
}

// デフォルト設定値
const defaultConfig: CognacConfig = {
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
    skipDiscussion: false,
  },
  claude: {
    maxTurnsExecution: 30,
    maxTurnsDiscussion: 1,
    stdoutTimeoutMs: 300000,
    processMaxRetries: 2,
  },
}

// 設定ファイルのヘルパー関数
export function defineConfig(config: Partial<CognacConfig>): CognacConfig {
  return {
    ...defaultConfig,
    ...config,
    git: { ...defaultConfig.git, ...config.git },
    ci: { ...defaultConfig.ci, ...config.ci },
    discussion: { ...defaultConfig.discussion, ...config.discussion },
    claude: { ...defaultConfig.claude, ...config.claude },
  }
}
