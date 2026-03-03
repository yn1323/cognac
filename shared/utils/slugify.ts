// ブランチ名用のスラグを生成する
// lowercase、記号→ハイフン、30文字切り詰め
export function slugify(text: string, maxLength = 30): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '')
}
