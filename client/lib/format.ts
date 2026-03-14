// フォーマット用ユーティリティ

// SQLiteのdatetime('now')はTZ情報なしのUTC文字列を返すため、Zを補完してUTCとして正しくパース
function normalizeUtc(dateStr: string): string {
  return dateStr.includes('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`
}

// UTCのDateをJST(UTC+9)に変換
function toJst(d: Date): Date {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000)
}

/**
 * ミリ秒を読みやすい文字列に変換する
 * 60秒未満: "12s", 60秒以上: "1:05"
 */
export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/**
 * 数値をカンマ区切りでフォーマットする
 * 例: 2340 → "2,340"
 */
const numberFormatter = new Intl.NumberFormat('en-US')
export function formatNumber(n: number): string {
  return numberFormatter.format(n)
}

/**
 * ISO日時文字列を YYYY/M/D H:MM 形式(JST)に変換する
 * null の場合は '-' を返す
 */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(normalizeUtc(dateStr))
  if (Number.isNaN(d.getTime())) return '-'
  const jst = toJst(d)
  return `${jst.getUTCFullYear()}/${jst.getUTCMonth() + 1}/${jst.getUTCDate()} ${jst.getUTCHours()}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

/**
 * ISO日時文字列を相対時間テキストに変換する
 * 例: "5分前", "3時間前", "1日前"
 */
export function formatRelativeTime(dateStr: string): string {
  const normalized = normalizeUtc(dateStr)
  const diff = Date.now() - new Date(normalized).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

/**
 * ISO日時文字列を hh:mm:ss 形式(JST)で表示する
 * nullの場合は --:--:-- を返す
 */
export function formatLogTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '--:--:--'
  const d = new Date(normalizeUtc(dateStr))
  if (Number.isNaN(d.getTime())) return '--:--:--'
  const jst = toJst(d)
  const hh = String(jst.getUTCHours()).padStart(2, '0')
  const mm = String(jst.getUTCMinutes()).padStart(2, '0')
  const ss = String(jst.getUTCSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
