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
