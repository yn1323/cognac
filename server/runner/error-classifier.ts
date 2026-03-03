// エラー分類ロジック
// stderr/stdoutの内容からエラーの種別を判定する
// task-runner.ts から呼ばれて、リトライ戦略の分岐に使う

import type { ErrorType } from '@solitary-coding/shared'

// インフラ系エラーのパターン（正規表現）
// ここにマッチしたら人間が介入しないと直せないやつ
const INFRA_PATTERNS: RegExp[] = [
  // ネットワーク系
  /ECONNREFUSED/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /socket hang up/i,
  /network error/i,
  /fetch failed/i,

  // レートリミット
  /rate_limit_exceeded/i,
  /rate limit/i,
  /too many requests/i,
  /429/,

  // 認証・権限
  /401 Unauthorized/i,
  /403 Forbidden/i,
  /authentication.*failed/i,
  /token.*expired/i,
  /EPERM/i,

  // リソース枯渇
  /ENOSPC/i,
  /no space left on device/i,
  /ENOMEM/i,
  /out of memory/i,
]

/**
 * エラー出力を分類する
 *
 * - インフラ系パターンにマッチ → 'infra'（人間が対処する必要あり）
 * - それ以外 → 'app'（Claude Codeに修正させてリトライ）
 *
 * 'process' はここでは返さない。
 * ProcessTimeoutError は task-runner.ts 側で catch して個別にハンドリングしてるから。
 */
export function classifyError(output: string, _exitCode: number): ErrorType {
  for (const pattern of INFRA_PATTERNS) {
    if (pattern.test(output)) {
      return 'infra'
    }
  }

  // パターンに一致しなければアプリ層エラー
  return 'app'
}
