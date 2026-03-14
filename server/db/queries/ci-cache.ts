// CIキャッシュのクエリ
// CIステップの検出結果をハッシュで管理するやつ

import type { CiStep } from '@cognac/shared'
import type { CognacDb } from '../types.js'

/**
 * キャッシュされたCIステップを取得する
 * config_hashが一致するものがあればパースして返す、なければnull
 */
export function getCachedSteps(db: CognacDb, configHash: string): CiStep[] | null {
  const stmt = db.prepare(`
    SELECT steps FROM ci_cache WHERE config_hash = ?
  `)

  const row = stmt.get(configHash) as { steps: string } | undefined
  if (!row) return null

  // JSON文字列をパースして返す
  return JSON.parse(row.steps) as unknown as CiStep[]
}

/**
 * CIステップをキャッシュに保存する
 * 同じconfig_hashがあったら上書きする（UPSERT）
 */
export function saveCachedSteps(db: CognacDb, steps: CiStep[], configHash: string): void {
  const stmt = db.prepare(`
    INSERT INTO ci_cache (steps, config_hash, detected_at)
    VALUES (@steps, @config_hash, datetime('now'))
    ON CONFLICT(config_hash)
    DO UPDATE SET steps = @steps, detected_at = datetime('now')
  `)

  stmt.run({
    steps: JSON.stringify(steps),
    config_hash: configHash,
  })
}
