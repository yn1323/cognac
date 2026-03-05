// cognac.config.ts をテンプレートで再生成するユーティリティ
// メモリ上の全設定値を使ってファイルを上書きする

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CognacConfig } from '@cognac/shared'

// CIステップ配列をインデント付きのTS配列リテラルに変換
function formatSteps(steps: CognacConfig['ci']['steps']): string {
  if (!steps || steps.length === 0) return ''
  const entries = steps
    .map((s) => `      { name: ${JSON.stringify(s.name)}, command: ${JSON.stringify(s.command)} }`)
    .join(',\n')
  return `\n    steps: [\n${entries},\n    ],`
}

// メモリ上の設定を cognac.config.ts に書き出す
export async function writeConfigFile(cwd: string, config: CognacConfig): Promise<void> {
  const content = `import { defineConfig } from 'cognac'

export default defineConfig({
  port: ${config.port},
  git: {
    defaultBranch: ${JSON.stringify(config.git.defaultBranch)},
  },
  ci: {
    maxRetries: ${config.ci.maxRetries},${formatSteps(config.ci.steps)}
  },
  discussion: {
    maxRounds: ${config.discussion.maxRounds},
    minPersonas: ${config.discussion.minPersonas},
    maxPersonas: ${config.discussion.maxPersonas},
    skipDiscussion: ${config.discussion.skipDiscussion},
  },
  claude: {
    maxTurnsExecution: ${config.claude.maxTurnsExecution},
    maxTurnsDiscussion: ${config.claude.maxTurnsDiscussion},
    stdoutTimeoutMs: ${config.claude.stdoutTimeoutMs},
    processMaxRetries: ${config.claude.processMaxRetries},
  },
})
`
  await writeFile(join(cwd, 'cognac.config.ts'), content, 'utf8')
}
