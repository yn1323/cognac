import type { ExplorationArtifact, ExplorationArtifactKind, ExplorationImage } from '@cognac/shared'
import type { CognacDb } from '../types.js'

export function createExplorationArtifact(
  db: CognacDb,
  data: {
    exploration_session_id: number
    kind: ExplorationArtifactKind
    title?: string | null
    content_text?: string | null
    file_path?: string | null
    metadata_json?: string | null
  },
): ExplorationArtifact {
  const stmt = db.prepare(`
    INSERT INTO exploration_artifacts (
      exploration_session_id, kind, title, content_text, file_path, metadata_json
    )
    VALUES (
      @exploration_session_id, @kind, @title, @content_text, @file_path, @metadata_json
    )
  `)

  const result = stmt.run({
    ...data,
    title: data.title ?? null,
    content_text: data.content_text ?? null,
    file_path: data.file_path ?? null,
    metadata_json: data.metadata_json ?? null,
  })

  return {
    id: Number(result.lastInsertRowid),
    exploration_session_id: data.exploration_session_id,
    kind: data.kind,
    title: data.title ?? null,
    content_text: data.content_text ?? null,
    file_path: data.file_path ?? null,
    metadata_json: data.metadata_json ?? null,
    created_at: new Date().toISOString(),
  }
}

export function createExplorationArtifacts(
  db: CognacDb,
  artifacts: Parameters<typeof createExplorationArtifact>[1][],
): ExplorationArtifact[] {
  if (artifacts.length === 0) return []
  return artifacts.map((artifact) => createExplorationArtifact(db, artifact))
}

export function listExplorationArtifacts(
  db: CognacDb,
  explorationSessionId: number,
): ExplorationArtifact[] {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_artifacts
    WHERE exploration_session_id = ?
    ORDER BY created_at ASC, id ASC
  `)
  return stmt.all(explorationSessionId) as unknown as ExplorationArtifact[]
}

export function deleteExplorationArtifactsBySessionId(
  db: CognacDb,
  explorationSessionId: number,
): number {
  const stmt = db.prepare(`
    DELETE FROM exploration_artifacts
    WHERE exploration_session_id = ?
  `)
  return Number(stmt.run(explorationSessionId).changes)
}

export function countExplorationFindings(db: CognacDb, explorationSessionId: number): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) AS count
    FROM exploration_artifacts
    WHERE exploration_session_id = ? AND kind = 'finding'
  `)
  const result = stmt.get(explorationSessionId) as { count: number }
  return result.count
}

export function listExplorationEvidenceImages(
  db: CognacDb,
  explorationSessionId: number,
): ExplorationImage[] {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_images
    WHERE exploration_session_id = ? AND source_type = 'playwright'
    ORDER BY created_at ASC, id ASC
  `)
  return stmt.all(explorationSessionId) as unknown as ExplorationImage[]
}
