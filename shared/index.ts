// 型定義

export type {
  CiConfig,
  ClaudeConfig,
  CliProvider,
  CognacConfig,
  CommitMessageLanguage,
  ConfigPatch,
  DiscussionConfig,
  GitConfig,
  SettingsPayload,
} from './types/config.js'
// ランタイム
export { defineConfig } from './types/config.js'
export type {
  ConsoleCommand,
  ConsoleCommandListItem,
  ConsoleLogResponse,
  ConsoleRun,
  ConsoleRunStatus,
  ConsoleStreamEvent,
  CreateConsoleCommandInput,
  UpdateConsoleCommandInput,
} from './types/console.js'
export type { Discussion, DiscussionDepth, DiscussionRound } from './types/discussion.js'
export { DISCUSSION_DEPTH_LABELS, DISCUSSION_DEPTH_OPTIONS } from './types/discussion.js'
export type {
  AgentStreamEvent,
  CiCache,
  CiStep,
  ErrorType,
  ExecutionLog,
  Phase,
  TaskEvent,
} from './types/events.js'
export type {
  CreateExplorationInput,
  ExplorationArtifact,
  ExplorationArtifactKind,
  ExplorationDiscussion,
  ExplorationEvent,
  ExplorationExecutionResult,
  ExplorationFindingResult,
  ExplorationImage,
  ExplorationImageSourceType,
  ExplorationListItem,
  ExplorationLog,
  ExplorationPersona,
  ExplorationPhase,
  ExplorationReportResult,
  ExplorationSession,
  ExplorationStatus,
  ExplorationTaskifyJob,
  ExplorationTaskifyJobStatus,
  ExplorationTaskifyResult,
} from './types/exploration.js'
export type {
  CommitResult,
  CommitStep,
  CommitStepStatus,
  GitBranch,
  GitBranchesResponse,
  GitCheckoutRequest,
  GitCommit,
  GitCommitResponse,
  GitCreateBranchRequest,
  GitExplainResponse,
  GitFile,
  GitFileDiffResponse,
  GitFileStatus,
  GitLogResponse,
  GitMergeRequest,
  GitMergeResponse,
  GitParentBranchResponse,
  GitPrInfo,
  GitPrInfoResponse,
  GitPullRequestRequest,
  GitPullRequestResponse,
  GitPushResponse,
  GitRemoteStatus,
  GitRemoteStatusResponse,
  GitRevertRequest,
  GitRevertResponse,
  GitStatusResponse,
  PrResult,
  PrStep,
  PrStepStatus,
} from './types/git.js'
export type { BaseLog, StoredEvent, StoredExplorationEvent, StoredTaskEvent } from './types/log.js'
export type { Persona, PersonaSelection } from './types/persona.js'
export type { Plan, PlanResult } from './types/plan.js'
export type {
  CreateTaskInput,
  PriorityLabel,
  Task,
  TaskImage,
  TaskStatus,
  UpdateTaskInput,
} from './types/task.js'
export { PRIORITY_MAP } from './types/task.js' // サーバー側で使う用（クライアントはローカル定義）
export { slugify } from './utils/slugify.js'
// hashFiles は Node 専用のため index からはエクスポートしない
// サーバーからは '@cognac/shared/utils/hash' で直接インポートする
