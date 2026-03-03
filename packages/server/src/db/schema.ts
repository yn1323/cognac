// データベーススキーマ定義
// テーブルとインデックスの作成をまとめてるやつ

import type Database from 'better-sqlite3'

// タスクテーブル
const CREATE_TASKS = `
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'discussing', 'planned', 'executing', 'testing', 'completed', 'paused', 'stopped')),
  priority INTEGER NOT NULL DEFAULT 0,
  queue_order INTEGER,
  branch_name TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  process_retry_count INTEGER NOT NULL DEFAULT 0,
  paused_reason TEXT,
  paused_phase TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
)`

// タスク画像テーブル
const CREATE_TASK_IMAGES = `
CREATE TABLE IF NOT EXISTS task_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
)`

// ペルソナテーブル
const CREATE_PERSONAS = `
CREATE TABLE IF NOT EXISTS personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  persona_id TEXT NOT NULL,
  name TEXT NOT NULL,
  focus TEXT NOT NULL,
  tone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
)`

// ディスカッションテーブル
const CREATE_DISCUSSIONS = `
CREATE TABLE IF NOT EXISTS discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  round INTEGER NOT NULL,
  persona_id TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  content TEXT NOT NULL,
  key_points TEXT,
  should_continue INTEGER NOT NULL DEFAULT 0,
  continue_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
)`

// プランテーブル
const CREATE_PLANS = `
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  plan_markdown TEXT NOT NULL,
  execution_prompt TEXT NOT NULL,
  personas_used TEXT NOT NULL,
  total_rounds INTEGER NOT NULL,
  estimated_complexity TEXT
    CHECK (estimated_complexity IN ('low', 'medium', 'high') OR estimated_complexity IS NULL),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
)`

// CIキャッシュテーブル
const CREATE_CI_CACHE = `
CREATE TABLE IF NOT EXISTS ci_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  steps TEXT NOT NULL,
  config_hash TEXT NOT NULL UNIQUE,
  detected_at TEXT NOT NULL DEFAULT (datetime('now'))
)`

// 実行ログテーブル
const CREATE_EXECUTION_LOGS = `
CREATE TABLE IF NOT EXISTS execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  phase TEXT NOT NULL
    CHECK (phase IN ('persona', 'discussion', 'plan', 'execute', 'ci', 'git', 'retry')),
  session_id TEXT,
  input_summary TEXT,
  output_raw TEXT,
  output_summary TEXT,
  token_input INTEGER,
  token_output INTEGER,
  duration_ms INTEGER,
  error_type TEXT
    CHECK (error_type IN ('app', 'infra', 'process') OR error_type IS NULL),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
)`

// インデックスたち
const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_queue_order ON tasks(queue_order)`,
  `CREATE INDEX IF NOT EXISTS idx_discussions_task_id ON discussions(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_execution_logs_task_id ON execution_logs(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_execution_logs_phase ON execution_logs(phase)`,
]

// 全テーブルのCREATE文
const TABLE_STATEMENTS = [
  CREATE_TASKS,
  CREATE_TASK_IMAGES,
  CREATE_PERSONAS,
  CREATE_DISCUSSIONS,
  CREATE_PLANS,
  CREATE_CI_CACHE,
  CREATE_EXECUTION_LOGS,
]

/**
 * スキーマ初期化
 * WALモードと外部キー制約を有効にして、全テーブル＆インデックスを作る
 */
export function initializeSchema(db: Database.Database): void {
  // WALモードで高速化するぞ
  db.pragma('journal_mode = WAL')

  // 外部キー制約を有効にしないと意味ないからね
  db.pragma('foreign_keys = ON')

  // テーブル作成はトランザクションでまとめてやる
  const migrate = db.transaction(() => {
    for (const stmt of TABLE_STATEMENTS) {
      db.prepare(stmt).run()
    }
    for (const stmt of CREATE_INDEXES) {
      db.prepare(stmt).run()
    }
  })

  migrate()
}
