// 型定義
export type { Task, TaskStatus, CreateTaskInput, UpdateTaskInput, TaskImage, PriorityLabel } from './types/task.js'
export { PRIORITY_MAP } from './types/task.js'  // サーバー側で使う用（クライアントはローカル定義）
export type { Persona, PersonaSelection } from './types/persona.js'
export type { Discussion, DiscussionRound } from './types/discussion.js'
export type { Plan, PlanResult } from './types/plan.js'
export type {
  ExplorationStatus,
  ExplorationPhase,
  ExplorationArtifactKind,
  ExplorationImageSourceType,
  ExplorationTaskifyJobStatus,
  ExplorationSession,
  ExplorationListItem,
  CreateExplorationInput,
  ExplorationImage,
  ExplorationPersona,
  ExplorationDiscussion,
  ExplorationArtifact,
  ExplorationLog,
  ExplorationTaskifyJob,
  ExplorationFindingResult,
  ExplorationExecutionResult,
  ExplorationReportResult,
  ExplorationTaskifyResult,
  ExplorationEvent,
} from './types/exploration.js'
export type {
  Phase,
  ErrorType,
  AgentStreamEvent,
  TaskEvent,
  ExecutionLog,
  CiStep,
  CiCache,
} from './types/events.js'
export type {
  CliProvider,
  CommitMessageLanguage,
  CognacConfig,
  GitConfig,
  CiConfig,
  DiscussionConfig,
  ClaudeConfig,
  SettingsPayload,
} from './types/config.js'
export type {
  GitFileStatus,
  GitFile,
  GitBranch,
  GitCommit,
  GitRemoteStatus,
  CommitStepStatus,
  CommitStep,
  CommitResult,
  GitStatusResponse,
  GitLogResponse,
  GitBranchesResponse,
  GitRemoteStatusResponse,
  GitCommitResponse,
  GitMergeResponse,
  GitPushResponse,
  GitCheckoutRequest,
  GitCreateBranchRequest,
  GitMergeRequest,
  GitExplainResponse,
} from './types/git.js'
export type {
  ConsoleRunStatus,
  ConsoleCommand,
  ConsoleRun,
  ConsoleCommandListItem,
  ConsoleLogResponse,
  CreateConsoleCommandInput,
  UpdateConsoleCommandInput,
  ConsoleStreamEvent,
} from './types/console.js'

// ランタイム
export { defineConfig } from './types/config.js'
export { slugify } from './utils/slugify.js'
// hashFiles は Node 専用のため index からはエクスポートしない
// サーバーからは '@cognac/shared/utils/hash' で直接インポートする
