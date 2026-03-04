// ディスカッション関連のユーティリティ

import type { Discussion } from '@cognac/shared'

/**
 * ディスカッションをラウンド番号でグルーピングする
 */
export function groupDiscussionsByRound(
  discussions: Discussion[],
): Map<number, Discussion[]> {
  const grouped = new Map<number, Discussion[]>()
  for (const d of discussions) {
    const existing = grouped.get(d.round) ?? []
    existing.push(d)
    grouped.set(d.round, existing)
  }
  return grouped
}
