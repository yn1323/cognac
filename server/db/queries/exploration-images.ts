import type Database from 'better-sqlite3'
import type {
  ExplorationImage,
  ExplorationImageSourceType,
} from '@cognac/shared'

export function createExplorationImages(
  db: Database.Database,
  images: {
    exploration_session_id: number
    source_type: ExplorationImageSourceType
    file_path: string
    original_name?: string | null
    mime_type: string
  }[],
): ExplorationImage[] {
  if (images.length === 0) return []

  const stmt = db.prepare(`
    INSERT INTO exploration_images (
      exploration_session_id, source_type, file_path, original_name, mime_type
    )
    VALUES (
      @exploration_session_id, @source_type, @file_path, @original_name, @mime_type
    )
  `)

  const results: ExplorationImage[] = []
  const insertAll = db.transaction(() => {
    for (const image of images) {
      const result = stmt.run({
        ...image,
        original_name: image.original_name ?? null,
      })
      results.push({
        id: Number(result.lastInsertRowid),
        exploration_session_id: image.exploration_session_id,
        source_type: image.source_type,
        file_path: image.file_path,
        original_name: image.original_name ?? null,
        mime_type: image.mime_type,
        created_at: new Date().toISOString(),
      })
    }
  })
  insertAll()
  return results
}

export function listExplorationImages(
  db: Database.Database,
  explorationSessionId: number,
): ExplorationImage[] {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_images
    WHERE exploration_session_id = ?
    ORDER BY created_at ASC, id ASC
  `)
  return stmt.all(explorationSessionId) as ExplorationImage[]
}

export function listExplorationImagesBySourceType(
  db: Database.Database,
  explorationSessionId: number,
  sourceType: ExplorationImageSourceType,
): ExplorationImage[] {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_images
    WHERE exploration_session_id = ?
      AND source_type = ?
    ORDER BY created_at ASC, id ASC
  `)
  return stmt.all(explorationSessionId, sourceType) as ExplorationImage[]
}

export function getExplorationImagesByIds(
  db: Database.Database,
  explorationSessionId: number,
  imageIds: number[],
): ExplorationImage[] {
  if (imageIds.length === 0) return []
  const placeholders = imageIds.map(() => '?').join(', ')
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_images
    WHERE exploration_session_id = ?
      AND id IN (${placeholders})
    ORDER BY id ASC
  `)
  return stmt.all(explorationSessionId, ...imageIds) as ExplorationImage[]
}

export function getExplorationImage(
  db: Database.Database,
  explorationSessionId: number,
  imageId: number,
): ExplorationImage | undefined {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_images
    WHERE id = ? AND exploration_session_id = ?
    LIMIT 1
  `)
  return stmt.get(imageId, explorationSessionId) as ExplorationImage | undefined
}

export function findExplorationImageBySessionAndPath(
  db: Database.Database,
  explorationSessionId: number,
  filePath: string,
): ExplorationImage | undefined {
  const stmt = db.prepare(`
    SELECT *
    FROM exploration_images
    WHERE exploration_session_id = ? AND file_path = ?
    LIMIT 1
  `)
  return stmt.get(explorationSessionId, filePath) as ExplorationImage | undefined
}

export function deleteExplorationImagesBySourceType(
  db: Database.Database,
  explorationSessionId: number,
  sourceType: ExplorationImageSourceType,
): number {
  const stmt = db.prepare(`
    DELETE FROM exploration_images
    WHERE exploration_session_id = ?
      AND source_type = ?
  `)
  return stmt.run(explorationSessionId, sourceType).changes
}
