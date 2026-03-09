// 実行ログのクエリ
// Claude Codeの呼び出し履歴を記録するやつ

import type Database from 'better-sqlite3'
import type { ExecutionLog } from '@cognac/shared'
import { insertLog, selectLogsByParentId, selectLogById, deleteLogsByParentId, type LogTableConfig } from './log-helpers.js'

const CONFIG: LogTableConfig = { tableName: 'execution_logs', parentColumn: 'task_id' }

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
  return insertLog<ExecutionLog>(db, CONFIG, { parentId: data.task_id, ...data })
}

/**
 * タスクIDで実行ログ一覧を取得する
 * 作成日時の古い順（時系列）で返す
 */
export function getLogsByTaskId(
  db: Database.Database,
  taskId: number,
): ExecutionLog[] {
  return selectLogsByParentId<ExecutionLog>(db, CONFIG, taskId)
}

/**
 * 実行ログを1件取得する
 */
export function getLog(
  db: Database.Database,
  id: number,
): ExecutionLog | undefined {
  return selectLogById<ExecutionLog>(db, CONFIG, id)
}

/**
 * タスクIDで実行ログを全削除する（リトライ時のクリーンアップ用）
 */
export function deleteLogsByTaskId(
  db: Database.Database,
  taskId: number,
): number {
  return deleteLogsByParentId(db, CONFIG, taskId)
}
