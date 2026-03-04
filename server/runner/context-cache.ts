// リポジトリ構造とタスク履歴のキャッシュ
// Phase 2のプロンプトに注入するコンテキスト情報を効率よく取得する

import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import * as taskQueries from '../db/queries/tasks.js'

const CONTEXT_DIR = path.resolve('.cognac', 'tmp', 'context')
const REPO_STRUCTURE_FILE = path.join(CONTEXT_DIR, 'repo-structure.md')
const REPO_HASH_FILE = path.join(CONTEXT_DIR, 'repo-structure.hash')
const TASK_HISTORY_FILE = path.join(CONTEXT_DIR, 'task-history.md')
const TASK_HISTORY_HASH_FILE = path.join(CONTEXT_DIR, 'task-history.hash')

const MAX_FILE_LINES = 500

// 同一パイプライン実行中の重複git ls-files呼び出しを回避するインメモリキャッシュ
let repoStructureMemCache: string | null = null
let taskHistoryMemCache: string | null = null

function ensureContextDir(): void {
  mkdirSync(CONTEXT_DIR, { recursive: true })
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * リポジトリのファイル構造をMarkdownで返す
 * SHA-256ハッシュで差分検出し、変更がなければキャッシュを返す
 *
 * NOTE: execSyncはハードコードされたコマンド文字列のみ使用（ユーザー入力なし）
 * git-ops.ts と同じパターン
 */
export function getRepoStructure(cwd: string = process.cwd()): string {
  if (repoStructureMemCache) return repoStructureMemCache

  let output: string
  try {
    output = execSync('git ls-files', {
      cwd,
      encoding: 'utf8',
      timeout: 30_000,
    })
  } catch {
    return '## リポジトリ構造\n\ngitリポジトリが検出されなかった'
  }

  const hash = sha256(output)

  // キャッシュチェック
  ensureContextDir()
  if (existsSync(REPO_HASH_FILE) && existsSync(REPO_STRUCTURE_FILE)) {
    const cachedHash = readFileSync(REPO_HASH_FILE, 'utf8')
    if (cachedHash === hash) {
      return readFileSync(REPO_STRUCTURE_FILE, 'utf8')
    }
  }

  // Markdown生成
  const lines = output.trim().split('\n')
  const totalCount = lines.length
  const truncated = lines.length > MAX_FILE_LINES
  const displayLines = truncated ? lines.slice(0, MAX_FILE_LINES) : lines

  let markdown = `## リポジトリ構造\n\nファイル数: ${totalCount}\n\n\`\`\`\n${displayLines.join('\n')}\n\`\`\``
  if (truncated) {
    markdown += `\n\n...（省略: 全${totalCount}ファイル）`
  }

  // キャッシュ書き出し
  writeFileSync(REPO_STRUCTURE_FILE, markdown, 'utf8')
  writeFileSync(REPO_HASH_FILE, hash, 'utf8')

  repoStructureMemCache = markdown
  return markdown
}

/**
 * 完了済みタスクの履歴をMarkdownテーブルで返す
 * 完了タスクIDのハッシュで差分検出し、変更がなければキャッシュを返す
 */
export function getTaskHistory(db: Database.Database): string {
  if (taskHistoryMemCache) return taskHistoryMemCache

  const allTasks = taskQueries.listTasks(db)
  const completedTasks = allTasks.filter((t) => t.status === 'completed')

  if (completedTasks.length === 0) {
    return '## 完了済みタスク履歴\n\n完了済みタスクなし'
  }

  // ハッシュ: 完了タスクIDのソート済み結合
  const hashKey = completedTasks
    .map((t) => t.id)
    .sort((a, b) => a - b)
    .join(',')
  const hash = sha256(hashKey)

  // キャッシュチェック
  ensureContextDir()
  if (existsSync(TASK_HISTORY_HASH_FILE) && existsSync(TASK_HISTORY_FILE)) {
    const cachedHash = readFileSync(TASK_HISTORY_HASH_FILE, 'utf8')
    if (cachedHash === hash) {
      return readFileSync(TASK_HISTORY_FILE, 'utf8')
    }
  }

  // Markdownテーブル生成
  const rows = completedTasks.map(
    (t) =>
      `| ${t.id} | ${t.title} | ${t.completed_at?.split('T')[0] ?? '-'} |`,
  )
  const markdown = [
    '## 完了済みタスク履歴',
    '',
    '| ID | タイトル | 完了日 |',
    '|----|---------|-------|',
    ...rows,
  ].join('\n')

  // キャッシュ書き出し
  writeFileSync(TASK_HISTORY_FILE, markdown, 'utf8')
  writeFileSync(TASK_HISTORY_HASH_FILE, hash, 'utf8')

  taskHistoryMemCache = markdown
  return markdown
}

/**
 * コンテキストキャッシュを全削除する
 */
export function invalidateContextCache(): void {
  // インメモリキャッシュもクリア
  repoStructureMemCache = null
  taskHistoryMemCache = null

  const files = [
    REPO_STRUCTURE_FILE,
    REPO_HASH_FILE,
    TASK_HISTORY_FILE,
    TASK_HISTORY_HASH_FILE,
  ]
  for (const file of files) {
    try {
      unlinkSync(file)
    } catch {
      // ファイルが存在しない場合は無視
    }
  }
}
