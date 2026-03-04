// ディスカッションのCRUD操作

import type Database from 'better-sqlite3'
import type { Discussion } from '@cognac/shared'

// SQLiteはbooleanをINTEGER(0/1)で保存するため、読み取り時に変換する
type RawDiscussion = Omit<Discussion, 'should_continue'> & {
  should_continue: number
}

function toDiscussion(r: RawDiscussion): Discussion {
  return { ...r, should_continue: Boolean(r.should_continue) }
}

/**
 * 1ラウンド分のディスカッション発言を一括保存する
 */
export function createDiscussionStatements(
  db: Database.Database,
  taskId: number,
  round: number,
  statements: {
    persona_id: string
    persona_name: string
    content: string
    key_points: string[] | null
    should_continue: boolean
    continue_reason: string | null
  }[],
): Discussion[] {
  if (statements.length === 0) return []

  const stmt = db.prepare(`
    INSERT INTO discussions (
      task_id, round, persona_id, persona_name, content,
      key_points, should_continue, continue_reason
    )
    VALUES (
      @task_id, @round, @persona_id, @persona_name, @content,
      @key_points, @should_continue, @continue_reason
    )
  `)

  const results: Discussion[] = []

  const insertAll = db.transaction(() => {
    for (const s of statements) {
      const params = {
        task_id: taskId,
        round,
        persona_id: s.persona_id,
        persona_name: s.persona_name,
        content: s.content,
        key_points: s.key_points ? JSON.stringify(s.key_points) : null,
        should_continue: s.should_continue ? 1 : 0,
        continue_reason: s.continue_reason ?? null,
      }
      const result = stmt.run(params)
      results.push({
        id: Number(result.lastInsertRowid),
        task_id: params.task_id,
        round: params.round,
        persona_id: params.persona_id,
        persona_name: params.persona_name,
        content: params.content,
        key_points: params.key_points,
        should_continue: s.should_continue,
        continue_reason: params.continue_reason,
        created_at: new Date().toISOString(),
      })
    }
  })

  insertAll()
  return results
}

/**
 * タスクIDでディスカッション一覧を取得する（ラウンド順）
 */
export function getDiscussionsByTaskId(
  db: Database.Database,
  taskId: number,
): Discussion[] {
  const stmt = db.prepare(
    `SELECT * FROM discussions WHERE task_id = ? ORDER BY round ASC, id ASC`,
  )
  return (stmt.all(taskId) as RawDiscussion[]).map(toDiscussion)
}

/**
 * タスクID + ラウンド番号でディスカッションを取得する
 */
export function getDiscussionsByRound(
  db: Database.Database,
  taskId: number,
  round: number,
): Discussion[] {
  const stmt = db.prepare(
    `SELECT * FROM discussions WHERE task_id = ? AND round = ? ORDER BY id ASC`,
  )
  return (stmt.all(taskId, round) as RawDiscussion[]).map(toDiscussion)
}

/**
 * タスクIDでディスカッションを全削除する（リトライ時のクリーンアップ用）
 */
export function deleteDiscussionsByTaskId(
  db: Database.Database,
  taskId: number,
): number {
  const stmt = db.prepare('DELETE FROM discussions WHERE task_id = ?')
  return stmt.run(taskId).changes
}
