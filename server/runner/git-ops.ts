// Git操作モジュール
// ブランチ作成・マージ・削除とかをラップしてるやつ

import { execSync } from 'node:child_process'

// gitコマンドを実行するヘルパー
// NOTE: argsはCognac内部のハードコード値のみ使用するためexecSyncで安全
function git(args: string, cwd: string = process.cwd()): string {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', timeout: 30000 }).trim()
}

// ブランチ名を組み立てる（task/{id}-{YYYYMMDD}形式）
export function buildBranchName(taskId: number): string {
  const now = new Date()
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `task/${taskId}-${d}`
}

// タスク用ブランチを作成する
// defaultBranchからpullして新しいブランチをチェックアウト
export function createTaskBranch(taskId: number, defaultBranch: string): string {
  const branchName = buildBranchName(taskId)
  git(`checkout ${defaultBranch}`)
  git('pull --no-rebase')
  git(`checkout -b ${branchName}`)
  return branchName
}

// タスクブランチをマージしてpushする
export function mergeTaskBranch(branchName: string, defaultBranch: string): void {
  git(`checkout ${defaultBranch}`)
  git(`merge ${branchName} --no-ff --no-edit`)
  git(`push origin ${defaultBranch}`)
  git(`branch -d ${branchName}`)
}

// タスクブランチを削除する（失敗しても無視）
export function deleteTaskBranch(branchName: string): void {
  try {
    git(`branch -D ${branchName}`)
  } catch {
    // ブランチがなくても気にしない
  }
}

// ブランチをリセットする（削除して作り直し）
export function resetTaskBranch(taskId: number, defaultBranch: string): string {
  const branchName = buildBranchName(taskId)
  deleteTaskBranch(branchName)
  git(`checkout ${defaultBranch}`)
  git('pull --no-rebase')
  git(`checkout -b ${branchName}`)
  return branchName
}

// 作業ツリーの状態を返す
export function getGitStatus(): string {
  return git('status --porcelain')
}
