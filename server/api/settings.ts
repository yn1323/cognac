// 設定API
// GET /settings — 現在のCI設定を返す
// PUT /settings — CI設定を更新（メモリ + cognac.config.ts）

import { Hono } from 'hono'
import { z } from 'zod'
import type { CognacConfig, ConfigPatch, SettingsPayload } from '@cognac/shared'
import { writeConfigFile } from '../runner/config-writer.js'

// 設定APIから現在値を読む代表ソース
export interface ConfigSource {
  getConfig(): CognacConfig
}

// 設定APIからホットリロードを受ける更新先
export interface ConfigAccessor {
  updateConfig(patch: ConfigPatch): void
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

export function settingsRouter(configSource: ConfigSource, accessors: ConfigAccessor[], cwd: string) {
  const app = new Hono()

  // 現在の設定を返す
  app.get('/', (c) => {
    const config = configSource.getConfig()
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

    const patch: ConfigPatch = { provider, ci, git }

    // 1. メモリ上のconfigを更新
    for (const accessor of accessors) {
      accessor.updateConfig(patch)
    }

    // 2. cognac.config.ts に書き出す（全設定値を保持）
    const fullConfig = configSource.getConfig()
    await writeConfigFile(cwd, fullConfig)

    return c.json({ ok: true })
  })

  return app
}
