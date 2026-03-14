// 経過時間をリアルタイム計算するフック
// completed_at があれば固定値、なければ1分間隔で再計算

import { useEffect, useState } from 'react'
import { normalizeUtc } from '@/lib/format'

function parseDate(dateStr: string): number {
  return new Date(normalizeUtc(dateStr)).getTime()
}

/**
 * 経過ミリ秒を返すフック
 * startedAt が null なら null を返す（pending状態）
 * completedAt があれば固定値、なければ1分間隔のタイマーで now() - startedAt を再計算
 */
export function useElapsedTime(
  startedAt: string | null,
  completedAt: string | null,
): number | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    // startedAt が null か completedAt がある場合はタイマー不要
    if (!startedAt || completedAt) return

    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [startedAt, completedAt])

  if (!startedAt) return null

  const start = parseDate(startedAt)
  if (completedAt) {
    return parseDate(completedAt) - start
  }
  return now - start
}
