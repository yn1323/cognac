// 設定API
// GET /settings — 現在のCI設定を返す
// PUT /settings — CI設定を更新（メモリ + cognac.config.ts）

import { Hono } from 'hono'
import { z } from 'zod'
import type { CognacConfig, CiStep, CommitMessageLanguage, CliProvider, SettingsPayload } from '@cognac/shared'
import { writeConfigFile } from '../runner/config-writer.js'

// TaskRunnerから設定を読み書きするインターフェース
export interface ConfigAccessor {
  getConfig(): CognacConfig
  updateConfig(patch: {
    provider: CliProvider
    ci: { maxRetries: number; steps?: CiStep[] }
    git: { commitLogLimit: number; commitMessageLanguage: CommitMessageLanguage }
  }): void
}

const ciStepSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
})

const updateSettingsSchema = z.object({
  provider: z.enum(['claude', 'codex']),
  ci: z.object({
    maxRetries: z.number().int().min(0).max(20),
    steps: z.array(ciStepSchema),
  }),
  git: z.object({
    commitLogLimit: z.number().int().min(1).max(100),
    commitMessageLanguage: z.enum(['ja', 'en']),
  }),
})

export function settingsRouter(accessor: ConfigAccessor, cwd: string) {
  const app = new Hono()

  // 現在の設定を返す
  app.get('/', (c) => {
    const config = accessor.getConfig()
    const payload: SettingsPayload = {
      provider: config.provider,
      ci: {
        maxRetries: config.ci.maxRetries,
        steps: config.ci.steps ?? [],
      },
      git: {
        commitLogLimit: config.git.commitLogLimit,
        commitMessageLanguage: config.git.commitMessageLanguage,
      },
    }
    return c.json(payload)
  })

  // 設定を更新する（メモリ更新 + ファイル書き込み）
  app.put('/', async (c) => {
    const body = await c.req.json()
    const parsed = updateSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }

    const { provider, ci, git } = parsed.data

    // 1. メモリ上のconfigを更新
    accessor.updateConfig({ provider, ci, git })

    // 2. cognac.config.ts に書き出す（全設定値を保持）
    const fullConfig = accessor.getConfig()
    await writeConfigFile(cwd, fullConfig)

    return c.json({ ok: true })
  })

  return app
}
