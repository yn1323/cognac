// フォームバリデーションユーティリティ

export const TITLE_MIN = 2
export const TITLE_MAX = 200

export function validateTitle(value: string): string {
  if (value.length < TITLE_MIN) return `タイトルは${TITLE_MIN}文字以上で入力してね`
  if (value.length > TITLE_MAX) return `タイトルは${TITLE_MAX}文字以内にしてね`
  return ''
}
