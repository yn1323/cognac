// node:sqlite の DatabaseSync を better-sqlite3 互換の緩い型で包むインターフェース
// better-sqlite3 と同レベルの型安全性を維持しつつ、キャスト地獄を回避する

/**
 * prepared statement のラッパー型
 * better-sqlite3 と同じ使い勝手で使える
 */
export interface CognacStatement {
  // biome-ignore lint/suspicious/noExplicitAny: better-sqlite3互換の緩い型
  run(...params: any[]): { changes: number; lastInsertRowid: number }
  // biome-ignore lint/suspicious/noExplicitAny: better-sqlite3互換の緩い型
  get(...params: any[]): any
  // biome-ignore lint/suspicious/noExplicitAny: better-sqlite3互換の緩い型
  all(...params: any[]): any[]
}

/**
 * CognacDb の薄いラッパー型
 * node:sqlite の厳密な型定義を better-sqlite3 互換の緩さに合わせる
 */
export interface CognacDb {
  prepare(sql: string): CognacStatement
  exec(sql: string): void
  close(): void
}
