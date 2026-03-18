import type { CiStep } from './events.js'

// コミットメッセージ言語
export type CommitMessageLanguage = 'ja' | 'en'

// CLIプロバイダー種別
export type CliProvider = 'claude' | 'codex'

// 設定ホットリロード用の差分
export interface ConfigPatch {
  provider: CliProvider
  ci: {
    maxRetries: number
    steps?: CiStep[]
  }
  git: {
    defaultBranch: string
    commitLogLimit: number
    commitMessageLanguage: CommitMessageLanguage
  }
}

// 設定更新ペイロード（API用）
export interface SettingsPayload extends ConfigPatch {
  ci: {
    maxRetries: number
    steps: CiStep[] // 空配列 = 自動検出モード
  }
}

// Git設定
export interface GitConfig {
  defaultBranch: string
  commitLogLimit: number
  commitMessageLanguage: CommitMessageLanguage
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

// コンソールコマンド定義
export interface ConsoleCommandConfig {
  id: string
  name: string
  command: string
  note?: string
}

// 全体設定
export interface CognacConfig {
  port: number
  host: string
  provider: CliProvider
  git: GitConfig
  ci: CiConfig
  discussion: DiscussionConfig
  claude: ClaudeConfig
  consoleCommands?: ConsoleCommandConfig[]
}

// デフォルト設定値
const defaultConfig: CognacConfig = {
  port: 4000,
  host: '0.0.0.0',
  provider: 'claude',
  git: {
    defaultBranch: 'main',
    commitLogLimit: 50,
    commitMessageLanguage: 'ja',
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
    stdoutTimeoutMs: 600000,
    processMaxRetries: 2,
  },
  consoleCommands: [],
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
    consoleCommands: config.consoleCommands ?? defaultConfig.consoleCommands,
  }
}
