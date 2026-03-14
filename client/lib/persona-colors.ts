// ペルソナのカラーパレット
// 概要タブとディスカッションタブで共有

const PERSONA_COLORS = ['#7c3aed', '#2563eb', '#ea580c', '#16a34a', '#db2777', '#0891b2']

export function getPersonaColor(index: number): string {
  return PERSONA_COLORS[index % PERSONA_COLORS.length]
}

// フォールバック絵文字プール
// Claudeがemojiを返さなかった場合にpersona_idハッシュで決定
const FALLBACK_EMOJIS = ['🐱', '🦊', '🐸', '🍄', '🌈', '🔮', '🎲', '🌵', '🐙', '🎭', '🦉', '🍀']

// 簡易ハッシュ（persona_id文字列 → 数値）
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

// ペルソナの絵文字を取得
// emoji が空文字やundefinedの場合、persona_idからハッシュで安定的に割り当て
export function getPersonaEmoji(emoji: string | undefined, personaId: string): string {
  if (emoji) return emoji
  return FALLBACK_EMOJIS[simpleHash(personaId) % FALLBACK_EMOJIS.length]
}
