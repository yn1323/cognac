// Git GUI ハードコードデータ
// Server API未実装のため、デザイン準拠のモックデータ

import type { GitBranch, GitCommit, GitFile, GitRemoteStatus } from '@cognac/shared'

export const MOCK_FILES: GitFile[] = [
  { status: 'M', path: 'src/api/git.ts' },
  { status: 'A', path: 'src/api/git-routes.ts' },
  { status: 'D', path: 'src/runner/auto-commit.ts' },
  { status: 'M', path: 'src/runner/task-runner.ts' },
  { status: '?', path: 'src/api/merge-handler.ts' },
]

export const MOCK_BRANCHES: GitBranch[] = [
  { name: 'feat/git', current: true, remote: false },
  { name: 'main', current: false, remote: false },
  { name: 'feat/sse', current: false, remote: false },
  { name: 'main', current: false, remote: true },
  { name: 'feat/sse', current: false, remote: true },
  { name: 'feat/dashboard', current: false, remote: true },
]

export const MOCK_COMMITS: GitCommit[] = [
  {
    hash: 'a1b2c3d',
    message: 'feat: Git API エンドポイント追加',
    author: 'Claude',
    date: '2時間前',
    dotColor: '#2563eb',
    lineColor: '#2563eb',
  },
  {
    hash: 'e4f5g6h',
    message: 'fix: タスクランナーのタイムアウト修正',
    author: 'natani',
    date: '5時間前',
    dotColor: '#2563eb',
    lineColor: '#2563eb',
  },
  {
    hash: 'i7j8k9l',
    message: 'Merge feat/sse into main',
    author: 'natani',
    date: '1日前',
    dotColor: '#7c3aed',
    lineColor: '#2563eb',
    isMerge: true,
    mergeBadge: 'merge',
  },
  {
    hash: 'm0n1o2p',
    message: 'feat: SSEストリーミング実装',
    author: 'Claude',
    date: '1日前',
    dotColor: '#16a34a',
    lineColor: '#16a34a',
    branchBadge: 'feat/sse',
  },
  {
    hash: 'q3r4s5t',
    message: 'refactor: DB初期化処理',
    author: 'natani',
    date: '2日前',
    dotColor: '#2563eb',
    lineColor: '#2563eb',
  },
]

export const MOCK_REMOTE_STATUS: GitRemoteStatus = {
  ahead: 2,
  behind: 0,
}

export const MOCK_COMMIT_LOG_LINES = [
  { text: '$ git diff --staged' },
  { text: 'analyzing 5 changed files...' },
  { text: 'generating commit plan...' },
  { text: 'split into 2 commits', bold: true },
  { blank: true },
  { text: '$ git add src/api/git.ts src/api/git-routes.ts' },
  { text: '$ git commit -m "feat: Git API エンドポイント追加"' },
  { text: '[feat/git a1b2c3d] feat: Git API エンドポイント追加' },
  { text: ' 2 files changed, 145 insertions(+)' },
  { blank: true },
  { text: '$ git add src/runner/auto-commit.ts src/runner/task-runner.ts' },
  { text: '$ git commit -m "refactor: 自動コミット処理を削除"' },
]
