// Claude CLIの出力テキストからJSONオブジェクトを抽出するユーティリティ

/**
 * テキストからJSONを抽出してパースする
 *
 * 抽出戦略（順にフォールバック）:
 * 1. ```json ... ``` コードブロック
 * 2. ``` ... ``` 汎用コードブロック
 * 3. 先頭 { 〜 末尾 } の部分文字列
 * 4. 全て失敗 → Error throw
 */
export function extractJson<T>(text: string): T {
  if (!text.trim()) {
    throw new Error('JSONの抽出に失敗: 入力が空')
  }

  // 戦略1: ```json ... ``` コードブロック
  const jsonBlockMatch = text.match(/```json\s*\n([\s\S]*?)\n\s*```/)
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]) as T
    } catch {
      // パース失敗 → 次の戦略へ
    }
  }

  // 戦略2: ``` ... ``` 汎用コードブロック（jsonブロック以外）
  const genericBlockMatch = text.match(/```(?!json\b)[^\n]*\n([\s\S]*?)\n\s*```/)
  if (genericBlockMatch) {
    try {
      return JSON.parse(genericBlockMatch[1]) as T
    } catch {
      // パース失敗 → 次の戦略へ
    }
  }

  // 戦略3: 先頭 { 〜 末尾 } の部分文字列
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T
    } catch {
      // パース失敗 → エラー
    }
  }

  throw new Error(
    `JSONの抽出に失敗。入力テキストの先頭200文字: ${text.slice(0, 200)}`,
  )
}
