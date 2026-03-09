import type Database from 'better-sqlite3'
import type { ExplorationDiscussion } from '@cognac/shared'

type RawExplorationDiscussion = Omit<ExplorationDiscussion, 'should_continue'> & {
  should_continue: number
}

function toExplorationDiscussion(
  row: RawExplorationDiscussion,
): ExplorationDiscussion {
  return { ...row, should_continue: Boolean(row.should_continue) }
}

export function createExplorationDiscussionStatements(
  db: Database.Database,
  explorationSessionId: number,
  round: number,
  statements: {
    persona_id: string
    persona_name: string
    content: string
    key_points: string[] | null
    should_continue: boolean
    continue_reason: string | null
  }[],
): ExplorationDiscussion[] {
  if (statements.length === 0) return []

  const stmt = db.prepare(`
    INSERT INTO exploration_discussions (
      exploration_session_id, round, persona_id, persona_name, content,
      key_points, should_continue, continue_reason
    )
    VALUES (
      @exploration_session_id, @round, @persona_id, @persona_name, @content,
      @key_points, @should_continue, @continue_reason
    )
  `)

  const results: ExplorationDiscussion[] = []
  const insertAll = db.transaction(() => {
    for (const statement of statements) {
      const params = {
        exploration_session_id: explorationSessionId,
        round,
        persona_id: statement.persona_id,
        persona_name: statement.persona_name,
        content: statement.content,
        key_points: statement.key_points ? JSON.stringify(statement.key_points) : null,
        should_continue: statement.should_continue ? 1 : 0,
        continue_reason: statement.continue_reason ?? null,
      }
      const result = stmt.run(params)
      results.push({
        id: Number(result.lastInsertRowid),
        exploration_session_id: explorationSessionId,
        round,
        persona_id: statement.persona_id,
        persona_name: statement.persona_name,
        content: statement.content,
        key_points: params.key_points,
        should_continue: statement.should_continue,
        continue_reason: params.continue_reason,
        created_at: new Date().toISOString(),
      })
    }
  })

  insertAll()
  return results
}

export function getExplorationDiscussionsBySessionId(
  db: Database.Database,
  explorationSessionId: number,
): ExplorationDiscussion[] {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_discussions
    WHERE exploration_session_id = ?
    ORDER BY round ASC, id ASC
  `)
  return (stmt.all(explorationSessionId) as RawExplorationDiscussion[]).map(toExplorationDiscussion)
}

export function deleteExplorationDiscussionsBySessionId(
  db: Database.Database,
  explorationSessionId: number,
): number {
  const stmt = db.prepare(`
    DELETE FROM exploration_discussions
    WHERE exploration_session_id = ?
  `)
  return stmt.run(explorationSessionId).changes
}
