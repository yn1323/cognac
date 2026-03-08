// ディスカッション関連のユーティリティ

/**
 * ディスカッションをラウンド番号でグルーピングする
 */
export function groupDiscussionsByRound<T extends { round: number }>(
  discussions: T[],
): Map<number, T[]> {
  const grouped = new Map<number, T[]>()
  for (const d of discussions) {
    const existing = grouped.get(d.round) ?? ([] as T[])
    existing.push(d)
    grouped.set(d.round, existing)
  }
  return grouped
}
