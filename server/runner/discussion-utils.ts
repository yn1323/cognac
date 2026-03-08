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

/**
 * ディスカッションをMarkdown形式にフォーマットする
 */
export function formatDiscussions(
  discussions: { round: number; persona_name: string; content: string }[],
): string {
  const grouped = groupDiscussionsByRound(discussions)
  let markdown = ''
  for (const [round, entries] of grouped) {
    markdown += `### ラウンド ${round}\n`
    for (const discussion of entries) {
      markdown += `- ${discussion.persona_name}: ${discussion.content}\n`
    }
    markdown += '\n'
  }
  return markdown
}
