import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// 複数ファイルのハッシュを計算する（CIキャッシュ無効化用）
// ファイルが存在しない場合は空文字列として扱う
export function hashFiles(filePaths: string[]): string {
  const hash = createHash('sha256')
  for (const filePath of filePaths) {
    try {
      hash.update(readFileSync(filePath, 'utf8'))
    } catch {
      // ファイルが存在しない場合はスキップ
      hash.update('')
    }
  }
  return hash.digest('hex')
}
