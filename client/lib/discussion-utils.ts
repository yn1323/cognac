// ディスカッションユーティリティ（クライアント側）

// ラウンドごとにグルーピング
export function groupByRound<T extends { round: number }>(items: T[]): Map<number, T[]> {
  const grouped = new Map<number, T[]>()
  for (const item of items) {
    const existing = grouped.get(item.round) ?? []
    existing.push(item)
    grouped.set(item.round, existing)
  }
  return grouped
}
