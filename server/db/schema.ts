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

const CREATE_EXPLORATION_SESSIONS = `
CREATE TABLE IF NOT EXISTS exploration_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  request TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'completed', 'paused', 'failed')),
  current_phase TEXT
    CHECK (current_phase IN ('persona', 'discussion', 'explore', 'report', 'taskify') OR current_phase IS NULL),
  final_report_markdown TEXT,
  issue_count INTEGER NOT NULL DEFAULT 0,
  paused_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
)`

const CREATE_EXPLORATION_IMAGES = `
CREATE TABLE IF NOT EXISTS exploration_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exploration_session_id INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('user', 'playwright')),
  file_path TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (exploration_session_id) REFERENCES exploration_sessions(id) ON DELETE CASCADE
)`

const CREATE_EXPLORATION_PERSONAS = `
CREATE TABLE IF NOT EXISTS exploration_personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exploration_session_id INTEGER NOT NULL,
  persona_id TEXT NOT NULL,
  name TEXT NOT NULL,
  focus TEXT NOT NULL,
  tone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (exploration_session_id) REFERENCES exploration_sessions(id) ON DELETE CASCADE
)`

const CREATE_EXPLORATION_DISCUSSIONS = `
CREATE TABLE IF NOT EXISTS exploration_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exploration_session_id INTEGER NOT NULL,
  round INTEGER NOT NULL,
  persona_id TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  content TEXT NOT NULL,
  key_points TEXT,
  should_continue INTEGER NOT NULL DEFAULT 0,
  continue_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (exploration_session_id) REFERENCES exploration_sessions(id) ON DELETE CASCADE
)`

const CREATE_EXPLORATION_ARTIFACTS = `
CREATE TABLE IF NOT EXISTS exploration_artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exploration_session_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('plan', 'finding', 'playwright-log', 'report', 'taskify-result')),
  title TEXT,
  content_text TEXT,
  file_path TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (exploration_session_id) REFERENCES exploration_sessions(id) ON DELETE CASCADE
)`

const CREATE_EXPLORATION_LOGS = `
CREATE TABLE IF NOT EXISTS exploration_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exploration_session_id INTEGER NOT NULL,
  phase TEXT NOT NULL
    CHECK (phase IN ('persona', 'discussion', 'explore', 'report', 'taskify')),
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
  FOREIGN KEY (exploration_session_id) REFERENCES exploration_sessions(id) ON DELETE CASCADE
)`

const CREATE_EXPLORATION_TASKIFY_JOBS = `
CREATE TABLE IF NOT EXISTS exploration_taskify_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exploration_session_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  result_json TEXT,
  error_message TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (exploration_session_id) REFERENCES exploration_sessions(id) ON DELETE CASCADE
)`

// コンソールコマンド定義
const CREATE_CONSOLE_COMMANDS = `
CREATE TABLE IF NOT EXISTS console_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`

// コンソール実行履歴
const CREATE_CONSOLE_RUNS = `
CREATE TABLE IF NOT EXISTS console_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_id INTEGER NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('starting', 'running', 'stopping', 'completed', 'failed', 'killed')),
  pid INTEGER,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  exit_code INTEGER,
  termination_reason TEXT,
  log_file_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (command_id) REFERENCES console_commands(id) ON DELETE CASCADE
)`

// インデックスたち
const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_queue_order ON tasks(queue_order)`,
  `CREATE INDEX IF NOT EXISTS idx_discussions_task_id ON discussions(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_execution_logs_task_id ON execution_logs(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_execution_logs_phase ON execution_logs(phase)`,
  `CREATE INDEX IF NOT EXISTS idx_exploration_sessions_status_created ON exploration_sessions(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_exploration_images_session_source ON exploration_images(exploration_session_id, source_type)`,
  `CREATE INDEX IF NOT EXISTS idx_exploration_discussions_session_round ON exploration_discussions(exploration_session_id, round)`,
  `CREATE INDEX IF NOT EXISTS idx_exploration_artifacts_session_kind ON exploration_artifacts(exploration_session_id, kind)`,
  `CREATE INDEX IF NOT EXISTS idx_exploration_logs_session_phase ON exploration_logs(exploration_session_id, phase)`,
  `CREATE INDEX IF NOT EXISTS idx_exploration_taskify_jobs_session_status_requested ON exploration_taskify_jobs(exploration_session_id, status, requested_at)`,
  `CREATE INDEX IF NOT EXISTS idx_console_commands_updated_at ON console_commands(updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_console_runs_command_id ON console_runs(command_id)`,
  `CREATE INDEX IF NOT EXISTS idx_console_runs_status ON console_runs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_console_runs_started_at ON console_runs(started_at DESC)`,
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
  CREATE_EXPLORATION_SESSIONS,
  CREATE_EXPLORATION_IMAGES,
  CREATE_EXPLORATION_PERSONAS,
  CREATE_EXPLORATION_DISCUSSIONS,
  CREATE_EXPLORATION_ARTIFACTS,
  CREATE_EXPLORATION_LOGS,
  CREATE_EXPLORATION_TASKIFY_JOBS,
  CREATE_CONSOLE_COMMANDS,
  CREATE_CONSOLE_RUNS,
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
