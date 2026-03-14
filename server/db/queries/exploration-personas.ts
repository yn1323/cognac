import type { ExplorationPersona } from '@cognac/shared'
import { transaction } from '../transaction.js'
import type { CognacDb } from '../types.js'

export function createExplorationPersonas(
  db: CognacDb,
  explorationSessionId: number,
  personas: { persona_id: string; name: string; focus: string; tone: string; emoji: string }[],
): ExplorationPersona[] {
  if (personas.length === 0) return []

  const stmt = db.prepare(`
    INSERT INTO exploration_personas (
      exploration_session_id, persona_id, name, focus, tone, emoji
    )
    VALUES (
      @exploration_session_id, @persona_id, @name, @focus, @tone, @emoji
    )
  `)

  const results: ExplorationPersona[] = []
  const insertAll = transaction(db, () => {
    for (const persona of personas) {
      const result = stmt.run({
        exploration_session_id: explorationSessionId,
        ...persona,
      })
      results.push({
        id: Number(result.lastInsertRowid),
        exploration_session_id: explorationSessionId,
        ...persona,
        created_at: new Date().toISOString(),
      })
    }
  })

  insertAll()
  return results
}

export function getExplorationPersonasBySessionId(
  db: CognacDb,
  explorationSessionId: number,
): ExplorationPersona[] {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_personas
    WHERE exploration_session_id = ?
    ORDER BY id ASC
  `)
  return stmt.all(explorationSessionId) as unknown as ExplorationPersona[]
}

export function deleteExplorationPersonasBySessionId(
  db: CognacDb,
  explorationSessionId: number,
): number {
  const stmt = db.prepare(`
    DELETE FROM exploration_personas
    WHERE exploration_session_id = ?
  `)
  return Number(stmt.run(explorationSessionId).changes)
}
