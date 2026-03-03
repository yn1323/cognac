// DB接続管理
// ファイルパスを受け取ってDBを開く

import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { initializeSchema } from './schema.js'

/**
 * データベースを開く
 * ディレクトリがなければ作るし、WAL・外部キー・スキーマ初期化も全部やってくれる
 */
export function openDb(dbPath: string): Database.Database {
  // ディレクトリがなかったら作っとく
  mkdirSync(dirname(dbPath), { recursive: true })

  // DB接続
  const db = new Database(dbPath)

  // BigIntじゃなくてnumberで返してほしいよね
  db.defaultSafeIntegers(false)

  // スキーマ初期化（WALとforeign keysもここで有効化される）
  initializeSchema(db)

  return db
}
