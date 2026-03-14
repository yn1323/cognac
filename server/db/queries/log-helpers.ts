// ログテーブル共通クエリヘルパー
// execution_logs / exploration_logs の共通SQL操作を抽出

import type { BaseLog } from '@cognac/shared'
import type { CognacDb } from '../types.js'

export interface LogTableConfig {
  tableName: string
  parentColumn: string
}

const LOG_COLUMNS = [
  'phase',
  'session_id',
  'input_summary',
  'output_raw',
  'output_summary',
  'token_input',
  'token_output',
  'duration_ms',
  'error_type',
  'error_message',
] as const

export function insertLog<T extends BaseLog>(
  db: CognacDb,
  config: LogTableConfig,
  data: {
    parentId: number
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
  normalize?: (log: T) => T,
): T {
  const stmt = db.prepare(`
    INSERT INTO ${config.tableName} (
      ${config.parentColumn}, ${LOG_COLUMNS.join(', ')}
    )
    VALUES (
      @parentId, ${LOG_COLUMNS.map((c) => `@${c}`).join(', ')}
    )
  `)

  const result = stmt.run({
    parentId: data.parentId,
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

  return selectLogById<T>(db, config, Number(result.lastInsertRowid), normalize) as T
}

export function selectLogsByParentId<T extends BaseLog>(
  db: CognacDb,
  config: LogTableConfig,
  parentId: number,
  normalize?: (log: T) => T,
): T[] {
  const stmt = db.prepare(`
    SELECT * FROM ${config.tableName}
    WHERE ${config.parentColumn} = ?
    ORDER BY created_at ASC, id ASC
  `)
  const rows = stmt.all(parentId) as unknown as T[]
  return normalize ? rows.map(normalize) : rows
}

export function selectLogById<T extends BaseLog>(
  db: CognacDb,
  config: LogTableConfig,
  id: number,
  normalize?: (log: T) => T,
): T | undefined {
  const stmt = db.prepare(`SELECT * FROM ${config.tableName} WHERE id = ?`)
  const row = stmt.get(id) as unknown as T | undefined
  return row && normalize ? normalize(row) : row
}

export function deleteLogsByParentId(
  db: CognacDb,
  config: LogTableConfig,
  parentId: number,
): number {
  const stmt = db.prepare(`DELETE FROM ${config.tableName} WHERE ${config.parentColumn} = ?`)
  return Number(stmt.run(parentId).changes)
}
