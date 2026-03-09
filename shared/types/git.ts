// Git GUI 関連の型定義

// git status のファイルステータス
export type GitFileStatus = 'M' | 'A' | 'D' | '?'

// git status の変更ファイル情報
export interface GitFile {
  status: GitFileStatus
  path: string
}

// ブランチ情報
export interface GitBranch {
  name: string
  current: boolean
  remote: boolean
}

// コミット履歴エントリ
export interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
  dotColor: string
  lineColor: string
  isMerge?: boolean
  mergeBadge?: string
  branchBadge?: string
}

// リモートとの差分ステータス
export interface GitRemoteStatus {
  ahead: number
  behind: number
}

// AIコミットの進捗ステップ
export type CommitStepStatus = 'done' | 'in-progress' | 'pending'

export interface CommitStep {
  label: string
  status: CommitStepStatus
}

// AIコミット結果
export interface CommitResult {
  hash: string
  message: string
  filesChanged: number
  insertions: number
}

// --- API レスポンス型 ---

export interface GitStatusResponse {
  files: GitFile[]
  currentBranch: string
}

export interface GitLogResponse {
  commits: GitCommit[]
}

export interface GitBranchesResponse {
  branches: GitBranch[]
  current: string
}

export interface GitRemoteStatusResponse {
  ahead: number
  behind: number
}

export interface GitCommitResponse {
  results: CommitResult[]
}

export interface GitMergeResponse {
  ok: boolean
  hash: string
  message: string
}

export interface GitPushResponse {
  ok: boolean
  remote: string
  branch: string
}

export interface GitExplainResponse {
  explanation: string
}

export interface GitFileDiffResponse {
  path: string
  diff: string
}

// --- API リクエスト型 ---

export interface GitCheckoutRequest {
  branch: string
}

export interface GitCreateBranchRequest {
  name: string
  base?: string
}

export interface GitMergeRequest {
  from: string
  into: string
}
