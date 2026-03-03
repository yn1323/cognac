import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

// 設定ファイルのテンプレート
const CONFIG_TEMPLATE = `import { defineConfig } from 'cognac'

export default defineConfig({
  port: 4000,
  git: {
    defaultBranch: 'main',
  },
  ci: {
    maxRetries: 5,
  },
  discussion: {
    maxRounds: 3,
    minPersonas: 2,
    maxPersonas: 4,
  },
  claude: {
    maxTurnsExecution: 30,
    maxTurnsDiscussion: 1,
    stdoutTimeoutMs: 300000,
    processMaxRetries: 2,
  },
})
`

// .gitignoreに追加するエントリ
const GITIGNORE_ENTRY = '.cognac/'

// 作成するディレクトリ一覧
const DIRECTORIES = [
  '.cognac/images',
  '.cognac/logs',
  '.cognac/tmp/context',
] as const

/**
 * initコマンドの実行関数
 * プロジェクトにcognacの設定ファイルとディレクトリ構造を作るよ
 */
export async function runInit(): Promise<void> {
  const cwd = process.cwd()
  const configPath = join(cwd, 'cognac.config.ts')

  // 設定ファイルがもう存在してたらスキップ
  if (existsSync(configPath)) {
    console.warn('⚠ cognac.config.ts はもうあるよ。上書きしないでスキップするね')
    return
  }

  // 設定ファイルを書き出す
  writeFileSync(configPath, CONFIG_TEMPLATE, 'utf-8')
  console.log('✔ cognac.config.ts を作ったよ')

  // ディレクトリ構造を作る
  for (const dir of DIRECTORIES) {
    const dirPath = join(cwd, dir)
    mkdirSync(dirPath, { recursive: true })
  }
  console.log('✔ .cognac/ ディレクトリを作ったよ')

  // .gitignoreの処理
  const gitignorePath = join(cwd, '.gitignore')

  if (existsSync(gitignorePath)) {
    // .gitignoreがある場合、中身をチェック
    const content = readFileSync(gitignorePath, 'utf-8')
    const lines = content.split('\n').map((line) => line.trim())

    if (lines.includes(GITIGNORE_ENTRY)) {
      // もう入ってるならなにもしない
      console.log('✔ .gitignore にはもう .cognac/ が入ってるね')
    } else {
      // 末尾に改行がなければ追加してからエントリを足す
      const suffix = content.endsWith('\n') ? '' : '\n'
      appendFileSync(gitignorePath, `${suffix}${GITIGNORE_ENTRY}\n`, 'utf-8')
      console.log('✔ .gitignore に .cognac/ を追加したよ')
    }
  } else {
    // .gitignoreがなければ新規作成
    writeFileSync(gitignorePath, `${GITIGNORE_ENTRY}\n`, 'utf-8')
    console.log('✔ .gitignore を作って .cognac/ を追加したよ')
  }

  console.log('\n🎉 初期化おわり！ cognac を使う準備ができたよ')
}
