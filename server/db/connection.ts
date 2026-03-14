// DB接続管理
// ファイルパスを受け取ってDBを開く

import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { initializeSchema } from './schema.js'
import type { CognacDb } from './types.js'

/**
 * データベースを開く
 * ディレクトリがなければ作るし、WAL・外部キー・スキーマ初期化も全部やってくれる
 */
export function openDb(dbPath: string): CognacDb {
  // ディレクトリがなかったら作っとく
  mkdirSync(dirname(dbPath), { recursive: true })

  // DB接続
  const db = new DatabaseSync(dbPath)

  // DatabaseSync → CognacDb にキャスト（node:sqliteの厳密な型を緩める）
  const cognacDb = db as unknown as CognacDb

  // スキーマ初期化（WALとforeign keysもここで有効化される）
  initializeSchema(cognacDb)

  return cognacDb
}
