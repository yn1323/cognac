// 実行ログのクエリ
// Claude Codeの呼び出し履歴を記録するやつ

import type Database from 'better-sqlite3'
import type { ExecutionLog } from '@solitary-coding/shared'

/**
 * 実行ログを作成する
 * phase・token数・エラー情報とかを全部保存
 */
export function createLog(
  db: Database.Database,
  data: {
    task_id: number
    phase: string
    session_id?: string
    input_summary?: string
    output_raw?: string
    output_summary?: string
    token_input?: number
    token_output?: number
    duration_ms?: number
    error_type?: string
    error_message?: string
  },
): ExecutionLog {
  const stmt = db.prepare(`
    INSERT INTO execution_logs (
      task_id, phase, session_id, input_summary, output_raw, output_summary,
      token_input, token_output, duration_ms, error_type, error_message
    )
    VALUES (
      @task_id, @phase, @session_id, @input_summary, @output_raw, @output_summary,
      @token_input, @token_output, @duration_ms, @error_type, @error_message
    )
  `)

  const result = stmt.run({
    task_id: data.task_id,
    phase: data.phase,
    session_id: data.session_id ?? null,
    input_summary: data.input_summary ?? null,
    output_raw: data.output_raw ?? null,
    output_summary: data.output_summary ?? null,
    token_input: data.token_input ?? null,
    token_output: data.token_output ?? null,
    duration_ms: data.duration_ms ?? null,
    error_type: data.error_type ?? null,
    error_message: data.error_message ?? null,
  })

  return getLog(db, Number(result.lastInsertRowid))!
}

/**
 * タスクIDで実行ログ一覧を取得する
 * 作成日時の古い順（時系列）で返す
 */
export function getLogsByTaskId(
  db: Database.Database,
  taskId: number,
): ExecutionLog[] {
  const stmt = db.prepare(`
    SELECT * FROM execution_logs
    WHERE task_id = ?
    ORDER BY created_at ASC
  `)
  return stmt.all(taskId) as ExecutionLog[]
}

/**
 * 実行ログを1件取得する
 */
export function getLog(
  db: Database.Database,
  id: number,
): ExecutionLog | undefined {
  const stmt = db.prepare(`SELECT * FROM execution_logs WHERE id = ?`)
  return stmt.get(id) as ExecutionLog | undefined
}
