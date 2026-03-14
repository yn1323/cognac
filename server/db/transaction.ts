// better-sqlite3の db.transaction() 互換ヘルパー
// node:sqlite には transaction ヘルパーがないので自前で用意

import type { CognacDb } from './types.js'

/**
 * better-sqlite3の db.transaction(fn) と同じインターフェースを提供する
 * 返り値は「呼び出すとトランザクション内で fn を実行する関数」
 */
export function transaction<T>(db: CognacDb, fn: () => T): () => T {
  return () => {
    db.exec('BEGIN')
    try {
      const result = fn()
      db.exec('COMMIT')
      return result
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
}
