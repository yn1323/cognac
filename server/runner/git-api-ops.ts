// Git GUI API用の操作モジュール
// git-ops.ts はタスクランナー専用（stash管理等）なので、API用に別モジュールとして作成
//
// NOTE: execSync を使用しているが、git コマンドの引数はすべて
// validateBranchName() でバリデーション済み or ハードコード値のみ。
// ユーザー入力が直接シェルに渡ることはないため安全。

import { execSync, spawnSync } from 'node:child_process'
import type {
  CommitResult,
  GitBranch,
  GitCommit,
  GitFile,
  GitFileStatus,
  GitRemoteStatus,
} from '@cognac/shared'

// gitコマンドを実行するヘルパー（cwd必須）
// NOTE: argsはCognac内部のハードコード値 or バリデーション済みの値のみ使用するためexecSyncで安全
function git(args: string, cwd: string): string {
  return execSync(`git -c core.quotepath=false ${args}`, {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
  }).trimEnd()
}

// ブランチ名のバリデーション（コマンドインジェクション防止）
export function validateBranchName(name: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(name)
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
  git(`branch -D ${name}`, cwd)
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

// 特定ブランチをfetchする（リモートマージ用）
export function fetchBranch(cwd: string, branch: string): void {
  git(`fetch origin ${branch}`, cwd)
}

// マージする（ローカル: --no-ff、リモート: fetchしてffありマージ）
export function merge(cwd: string, from: string): { hash: string; message: string } {
  if (!validateBranchName(from)) throw new Error('不正なブランチ名です')
  try {
    // リモートブランチの場合: ピンポイントfetch → ffありマージ
    if (from.startsWith('origin/')) {
      const remoteBranch = from.replace('origin/', '')
      fetchBranch(cwd, remoteBranch)
      git(`merge ${from} --no-edit`, cwd)
    } else {
      // ローカル同士: 従来通り --no-ff
      git(`merge ${from} --no-ff --no-edit`, cwd)
    }
    const hash = git('rev-parse --short HEAD', cwd)
    const message = git('log -1 --format=%s', cwd)
    return { hash, message }
  } catch (err) {
    // コンフリクト時は abort して throw
    try {
      git('merge --abort', cwd)
    } catch {
      /* abort失敗は無視 */
    }
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('CONFLICT') || errMsg.includes('Automatic merge failed')) {
      throw new Error('マージコンフリクトが発生しました。手動で解決してください。')
    }
    throw err
  }
}

// コミットをリバートする
export function revert(cwd: string, hash: string): { hash: string; message: string } {
  if (!validateCommitHash(hash)) throw new Error('不正なコミットハッシュです')
  try {
    // マージコミット判定: rev-listの出力は "hash parent1 parent2..." 形式
    // 親が2つ以上（= split結果が3以上）ならマージコミット → -m 1 を付与
    const parts = git(`rev-list --parents -1 ${hash}`, cwd).split(' ')
    const isMergeCommit = parts.length > 2
    const mergeFlag = isMergeCommit ? '-m 1 ' : ''
    git(`revert ${mergeFlag}--no-edit ${hash}`, cwd)
    const newHash = git('rev-parse --short HEAD', cwd)
    const message = git('log -1 --format=%s', cwd)
    return { hash: newHash, message }
  } catch (err) {
    // コンフリクト時は abort して throw（abort失敗は無視）
    try {
      git('revert --abort', cwd)
    } catch {
      /* abort失敗は無視 */
    }
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('CONFLICT') || errMsg.includes('conflict')) {
      throw new Error('コンフリクトが発生したためリバートを中断しました。')
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

// 指定ファイルの未コミットdiff（staged + unstaged）を取得する
export function getFileDiff(cwd: string, filePath: string): string {
  try {
    return git(`diff HEAD -- "${filePath}"`, cwd)
  } catch {
    // HEAD が存在しない場合（初回コミット前）
    return git(`diff --cached -- "${filePath}"`, cwd)
  }
}

// gh CLIが利用可能か確認する
export function checkGhInstalled(): void {
  try {
    execSync('gh --version', { encoding: 'utf8', timeout: 5000 })
  } catch {
    throw new Error(
      'gh CLIがインストールされていません。https://cli.github.com/ からインストールしてください。',
    )
  }
}

// gh CLIの認証状態を確認する
export function checkGhAuth(): void {
  try {
    execSync('gh auth status', { encoding: 'utf8', timeout: 10000 })
  } catch {
    throw new Error('gh CLIの認証が必要です。`gh auth login` を実行してください。')
  }
}

// 現在のブランチに紐づく既存のオープンPRを検出する
export function findExistingPr(
  cwd: string,
  headBranch: string,
): { number: number; url: string } | null {
  try {
    const output = execSync(
      `gh pr list --head ${headBranch} --state open --json number,url --limit 1`,
      { cwd, encoding: 'utf8', timeout: 10000 },
    ).trim()
    const prs = JSON.parse(output) as { number: number; url: string }[]
    return prs.length > 0 ? prs[0] : null
  } catch {
    return null
  }
}

// state情報を含むPR検索（Git画面表示用）
export function findExistingPrWithState(
  cwd: string,
  headBranch: string,
): { number: number; url: string; state: 'open' | 'merged' | 'closed' } | null {
  try {
    const output = execSync(
      `gh pr list --head ${headBranch} --state all --json number,url,state --limit 1`,
      { cwd, encoding: 'utf8', timeout: 10000 },
    ).trim()
    const prs = JSON.parse(output) as { number: number; url: string; state: string }[]
    if (prs.length === 0) return null
    return {
      number: prs[0].number,
      url: prs[0].url,
      state: prs[0].state as 'open' | 'merged' | 'closed',
    }
  } catch {
    return null
  }
}

// gh CLIでPRを作成する
export function createGhPr(
  cwd: string,
  params: { title: string; body: string; base: string; head: string },
): { number: number; url: string } {
  const result = spawnSync(
    'gh',
    [
      'pr',
      'create',
      '--title',
      params.title,
      '--body',
      params.body,
      '--base',
      params.base,
      '--head',
      params.head,
    ],
    { cwd, encoding: 'utf8', timeout: 30000 },
  )
  if (result.status !== 0) {
    throw new Error(result.stderr || 'PR作成に失敗しました')
  }
  // gh pr create はPRのURLを標準出力に返す（例: https://github.com/owner/repo/pull/42）
  const url = result.stdout.trim()
  const match = url.match(/\/pull\/(\d+)\s*$/)
  if (!match) {
    throw new Error(`PR URLのパースに失敗: ${url}`)
  }
  return { number: Number(match[1]), url }
}

// gh CLIで既存PRを更新する
export function updateGhPr(
  cwd: string,
  prNumber: number,
  params: { title: string; body: string },
): { number: number; url: string } {
  const result = spawnSync(
    'gh',
    ['pr', 'edit', String(prNumber), '--title', params.title, '--body', params.body],
    { cwd, encoding: 'utf8', timeout: 30000 },
  )
  if (result.status !== 0) {
    throw new Error(result.stderr || 'PR更新に失敗しました')
  }
  // gh pr edit は直接JSONを返さないので、URLを取得
  const urlResult = spawnSync('gh', ['pr', 'view', String(prNumber), '--json', 'number,url'], {
    cwd,
    encoding: 'utf8',
    timeout: 10000,
  })
  if (urlResult.status !== 0) {
    return { number: prNumber, url: '' }
  }
  return JSON.parse(urlResult.stdout.trim()) as { number: number; url: string }
}

// ベースブランチとの差分を取得する（PR内容生成用）
export function getDiffAgainstBase(cwd: string, baseBranch: string): string {
  // baseBranch → origin/${baseBranch} → エラー の3段フォールバック
  try {
    return git(`diff ${baseBranch}...HEAD`, cwd)
  } catch {
    // ローカルにbaseBranchがない場合、リモート参照で再試行
    try {
      return git(`diff origin/${baseBranch}...HEAD`, cwd)
    } catch {
      throw new Error(
        `ベースブランチ '${baseBranch}' との差分を取得できません。fetchを実行してください。`,
      )
    }
  }
}

// ベースブランチとの差分のstat（ファイル一覧サマリー）を取得する
export function getDiffStatAgainstBase(cwd: string, baseBranch: string): string {
  try {
    return git(`diff ${baseBranch}...HEAD --stat`, cwd)
  } catch {
    try {
      return git(`diff origin/${baseBranch}...HEAD --stat`, cwd)
    } catch {
      return ''
    }
  }
}

// ベースブランチからの全コミットログを取得する（PR内容生成用）
export function getLogAgainstBase(cwd: string, baseBranch: string): string {
  try {
    return git(`log ${baseBranch}..HEAD --oneline`, cwd)
  } catch {
    return ''
  }
}

// 特定コミットのdiffを取得する（AI解説用）
export function getCommitDiff(cwd: string, hash: string): string {
  if (!validateCommitHash(hash)) throw new Error('不正なコミットハッシュです')
  return git(`show ${hash} --format=""`, cwd)
}

// 現在のブランチの親ブランチを推定する
// ローカルブランチのみを候補として、merge-base でHEADに最も近いブランチを返す
export function getParentBranch(
  cwd: string,
  defaultBranch: string,
): { branch: string; estimated: boolean } {
  const currentBranch = getCurrentBranch(cwd)
  if (!currentBranch) return { branch: defaultBranch, estimated: false }

  // ローカルブランチ一覧を取得（現在のブランチを除外）
  const branches = getBranches(cwd)
    .filter((b) => !b.remote && b.name !== currentBranch)
    .map((b) => b.name)

  if (branches.length === 0) return { branch: defaultBranch, estimated: false }

  let bestBranch = defaultBranch
  let bestDistance = Number.MAX_SAFE_INTEGER
  let found = false

  for (const candidate of branches) {
    try {
      // merge-base を取得
      const mergeBase = git(`merge-base ${candidate} HEAD`, cwd)
      if (!mergeBase) continue
      // merge-base から HEAD までのコミット数
      const countStr = git(`rev-list --count ${mergeBase}..HEAD`, cwd)
      const distance = Number.parseInt(countStr, 10)
      if (distance < bestDistance) {
        bestDistance = distance
        bestBranch = candidate
        found = true
      }
    } catch {
      // merge-base 取得失敗は無視して次の候補へ
    }
  }

  return { branch: bestBranch, estimated: found }
}

// execSyncのエラーからgitのstderrメッセージだけ取り出すヘルパー
export function extractGitError(err: unknown): string {
  if (err && typeof err === 'object' && 'stderr' in err) {
    const stderr = (err as { stderr: string | Buffer }).stderr
    const text = typeof stderr === 'string' ? stderr : (stderr?.toString() ?? '')
    if (text.trim()) return text.trim()
  }
  if (err instanceof Error) return err.message
  return String(err)
}

// コミットを実行してCommitResultを返す
export function commitWithMessage(cwd: string, message: string): CommitResult {
  // spawnSyncで引数配列として渡し、シェル解釈を回避（Win/Mac両対応）
  const commitResult = spawnSync(
    'git',
    [
      '-c',
      'i18n.commitEncoding=utf-8',
      'commit',
      '--author=Claude <noreply@anthropic.com>',
      '-m',
      message,
    ],
    { cwd, encoding: 'utf8', timeout: 30000 },
  )
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
  } catch {
    /* 最初のコミットの場合は無視 */
  }
  return { hash, message, filesChanged, insertions }
}
