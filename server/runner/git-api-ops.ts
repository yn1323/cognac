// Git GUI API用の操作モジュール
// git-ops.ts はタスクランナー専用（stash管理等）なので、API用に別モジュールとして作成
//
// NOTE: execSync を使用しているが、git コマンドの引数はすべて
// validateBranchName() でバリデーション済み or ハードコード値のみ。
// ユーザー入力が直接シェルに渡ることはないため安全。

import { execSync, spawnSync } from 'node:child_process'
import type { GitFile, GitFileStatus, GitBranch, GitCommit, GitRemoteStatus, CommitResult } from '@cognac/shared'

// gitコマンドを実行するヘルパー（cwd必須）
// NOTE: argsはCognac内部のハードコード値 or バリデーション済みの値のみ使用するためexecSyncで安全
function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', timeout: 30000 }).trimEnd()
}

// ブランチ名のバリデーション（コマンドインジェクション防止）
export function validateBranchName(name: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9\/_.\-]*$/.test(name)
}

// git status --porcelain をパースして GitFile[] を返す
export function getStatus(cwd: string): GitFile[] {
  const output = git('status --porcelain', cwd)
  if (!output) return []
  return output.split('\n').map((line) => {
    const xy = line.substring(0, 2)
    const path = line.substring(3)
    let status: GitFileStatus = '?'
    if (xy.includes('M')) status = 'M'
    else if (xy.includes('A')) status = 'A'
    else if (xy.includes('D')) status = 'D'
    else if (xy.includes('?')) status = '?'
    return { status, path }
  })
}

// 現在のブランチ名を返す
export function getCurrentBranch(cwd: string): string {
  return git('branch --show-current', cwd)
}

// コミット履歴を取得する
export function getLog(cwd: string, limit = 20): GitCommit[] {
  const sep = '\x1f' // Unit Separator
  const format = `%h${sep}%s${sep}%an${sep}%ar${sep}%P${sep}%D`
  let output: string
  try {
    output = git(`log --format="${format}" -${limit}`, cwd)
  } catch {
    return [] // コミットがないリポジトリ
  }
  if (!output) return []

  return output.split('\n').map((line) => {
    // ダブルクォートが残る場合は除去
    const cleaned = line.replace(/^"|"$/g, '')
    const [hash, message, author, date, parents, decorations] = cleaned.split(sep)
    const parentList = (parents ?? '').split(' ').filter(Boolean)
    const isMerge = parentList.length > 1

    // ブランチバッジ: decorations から HEAD -> xxx やブランチ名を抽出
    let branchBadge: string | undefined
    if (decorations) {
      const refs = decorations.split(',').map((r) => r.trim())
      for (const ref of refs) {
        const cleaned = ref.replace('HEAD -> ', '').replace('origin/', '')
        if (cleaned && cleaned !== 'HEAD') {
          branchBadge = cleaned
          break
        }
      }
    }

    return {
      hash: hash ?? '',
      message: message ?? '',
      author: author ?? '',
      date: date ?? '',
      dotColor: isMerge ? '#a855f7' : '#2563eb', // マージは紫、通常は青
      lineColor: isMerge ? '#a855f7' : '#2563eb',
      isMerge,
      mergeBadge: isMerge ? 'merge' : undefined,
      branchBadge,
    }
  })
}

// ブランチ一覧を返す（ローカル + リモート）
export function getBranches(cwd: string): GitBranch[] {
  const output = git('branch -a --format="%(refname:short)|%(HEAD)"', cwd)
  if (!output) return []

  const branches: GitBranch[] = []
  const seen = new Set<string>()

  for (const line of output.split('\n')) {
    const cleaned = line.replace(/^"|"$/g, '')
    const [rawName, head] = cleaned.split('|')
    if (!rawName) continue

    const isRemote = rawName.startsWith('origin/')
    const name = rawName
    const current = head?.trim() === '*'

    // HEAD参照はスキップ
    if (name === 'origin/HEAD') continue

    // リモートブランチでローカルに同名がある場合はスキップ
    if (isRemote) {
      const localName = name.replace('origin/', '')
      if (seen.has(localName)) continue
    }

    seen.add(isRemote ? name.replace('origin/', '') : name)
    branches.push({ name, current, remote: isRemote })
  }

  return branches
}

// リモートとの差分を取得する（ahead / behind）
// --left-right で 1回のgitプロセスで両方取得
export function getRemoteStatus(cwd: string): GitRemoteStatus {
  try {
    const out = git('rev-list --count --left-right @{u}...HEAD', cwd)
    const [behindStr, aheadStr] = out.split('\t')
    return {
      ahead: Number.parseInt(aheadStr ?? '0', 10),
      behind: Number.parseInt(behindStr ?? '0', 10),
    }
  } catch {
    // upstream未設定の場合
    return { ahead: 0, behind: 0 }
  }
}

// ブランチを切り替える
export function checkout(cwd: string, branch: string): void {
  if (!validateBranchName(branch)) throw new Error('不正なブランチ名です')
  // リモートブランチの場合はローカルに作成して切り替え
  if (branch.startsWith('origin/')) {
    const localName = branch.replace('origin/', '')
    git(`checkout -b ${localName} ${branch}`, cwd)
  } else {
    git(`checkout ${branch}`, cwd)
  }
}

// 新しいブランチを作成する
export function createBranch(cwd: string, name: string, base?: string): void {
  if (!validateBranchName(name)) throw new Error('不正なブランチ名です')
  if (base && !validateBranchName(base)) throw new Error('不正なベースブランチ名です')
  const args = base ? `checkout -b ${name} ${base}` : `checkout -b ${name}`
  git(args, cwd)
}

// ブランチを削除する（ローカルのみ）
export function deleteBranch(cwd: string, name: string): void {
  if (!validateBranchName(name)) throw new Error('不正なブランチ名です')
  git(`branch -d ${name}`, cwd)
}

// 全変更を破棄する
export function discardAll(cwd: string): void {
  git('checkout -- .', cwd)
  git('clean -fd', cwd)
}

// 現在のブランチをリモートにpushする
export function push(cwd: string): { remote: string; branch: string } {
  const branch = getCurrentBranch(cwd)
  git(`push -u origin ${branch}`, cwd)
  return { remote: 'origin', branch }
}

// リモートの最新情報を取得する
export function fetchAll(cwd: string): void {
  git('fetch --all --prune', cwd)
}

// マージする（--no-ff）
export function merge(cwd: string, from: string): { hash: string; message: string } {
  if (!validateBranchName(from)) throw new Error('不正なブランチ名です')
  try {
    git(`merge ${from} --no-ff --no-edit`, cwd)
    const hash = git('rev-parse --short HEAD', cwd)
    const message = git('log -1 --format=%s', cwd)
    return { hash, message }
  } catch (err) {
    // コンフリクト時は abort して throw
    try {
      git('merge --abort', cwd)
    } catch { /* abort失敗は無視 */ }
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('CONFLICT') || errMsg.includes('Automatic merge failed')) {
      throw new Error('マージコンフリクトが発生しました。手動で解決してください。')
    }
    throw err
  }
}

// 全変更をステージングする（AIコミット用）
export function stageAll(cwd: string): void {
  git('add -A', cwd)
}

// ステージング済みのdiffを取得する（AIコミット用）
export function getStagedDiff(cwd: string): string {
  return git('diff --staged', cwd)
}

// 未コミットの全変更（staged + unstaged）のdiffを取得する（AI解説用）
export function getWorkingDiff(cwd: string): string {
  try {
    return git('diff HEAD', cwd)
  } catch {
    // 最初のコミット前はHEADが存在しないため、全ファイルをdiffとして返す
    return git('diff --cached', cwd)
  }
}

// 直近のコミットログを取得する（AIコミットのスタイル参考用）
export function getRecentLogOneline(cwd: string, count = 10): string {
  try {
    return git(`log --oneline -${count}`, cwd)
  } catch {
    return ''
  }
}

// コミットハッシュのバリデーション（コマンドインジェクション防止）
export function validateCommitHash(hash: string): boolean {
  return /^[0-9a-f]{4,40}$/i.test(hash)
}

// 特定コミットのdiffを取得する（AI解説用）
export function getCommitDiff(cwd: string, hash: string): string {
  if (!validateCommitHash(hash)) throw new Error('不正なコミットハッシュです')
  return git(`show ${hash} --format=""`, cwd)
}

// コミットを実行してCommitResultを返す
export function commitWithMessage(cwd: string, message: string): CommitResult {
  // spawnSyncで引数配列として渡し、シェル解釈を回避（Win/Mac両対応）
  const commitResult = spawnSync('git', [
    '-c', 'i18n.commitEncoding=utf-8',
    'commit',
    '--author=Claude <noreply@anthropic.com>',
    '-m',
    message,
  ], { cwd, encoding: 'utf8', timeout: 30000 })
  if (commitResult.status !== 0) {
    throw new Error(commitResult.stderr || 'git commit failed')
  }
  const hash = git('rev-parse --short HEAD', cwd)
  // diffstatを取得
  let filesChanged = 0
  let insertions = 0
  try {
    const stat = git('diff --stat HEAD~1..HEAD', cwd)
    const match = stat.match(/(\d+) files? changed(?:, (\d+) insertions?)?/)
    if (match) {
      filesChanged = Number.parseInt(match[1], 10)
      insertions = Number.parseInt(match[2] ?? '0', 10)
    }
  } catch { /* 最初のコミットの場合は無視 */ }
  return { hash, message, filesChanged, insertions }
}
