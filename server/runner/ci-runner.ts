import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CiStep, CognacConfig, TaskEvent } from '@cognac/shared'
import { hashFiles } from '@cognac/shared/utils/hash'
import * as ciCacheQueries from '../db/queries/ci-cache.js'
import type Database from 'better-sqlite3'

// CI関連の設定ファイル（ハッシュ変更でキャッシュ無効化）
const CI_CONFIG_FILES = [
  'package.json',
  'tsconfig.json',
  'tsconfig.*.json',
  '.eslintrc.*',
  'eslint.config.*',
  'biome.json',
  'vite.config.*',
  'vitest.config.*',
  'jest.config.*',
]

// package.jsonからCIステップを簡易検出する
function detectFromPackageJson(cwd: string): CiStep[] {
  const steps: CiStep[] = []
  try {
    const pkgJson = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
    const scripts = pkgJson.scripts ?? {}
    if (scripts.typecheck) steps.push({ name: 'typecheck', command: 'pnpm run typecheck' })
    if (scripts.lint) steps.push({ name: 'lint', command: 'pnpm run lint' })
    if (scripts.test) steps.push({ name: 'test', command: 'pnpm run test' })
    if (scripts.build) steps.push({ name: 'build', command: 'pnpm run build' })
  } catch {
    // package.jsonが読めない場合は空
  }
  return steps
}

// CIステップを取得する（キャッシュ or 検出）
export function getCiSteps(
  db: Database.Database,
  config: CognacConfig,
  cwd: string = process.cwd(),
): CiStep[] {
  // configで明示指定されてたらそれを使う
  if (config.ci.steps && config.ci.steps.length > 0) {
    return config.ci.steps
  }

  // 設定ファイルのハッシュを計算
  const configFiles = CI_CONFIG_FILES.map((f) => join(cwd, f))
  const configHash = hashFiles(configFiles)

  // キャッシュチェック
  const cached = ciCacheQueries.getCachedSteps(db, configHash)
  if (cached) {
    return cached
  }

  // 簡易検出
  const steps = detectFromPackageJson(cwd)

  // キャッシュ保存
  if (steps.length > 0) {
    ciCacheQueries.saveCachedSteps(db, steps, configHash)
  }

  return steps
}

// CIステップの実行結果
export interface CiStepResult {
  step: CiStep
  success: boolean
  output: string
  durationMs: number
}

// 全CIステップを実行する
export function runCi(
  steps: CiStep[],
  onEvent?: (event: TaskEvent) => void,
  cwd: string = process.cwd(),
): { success: boolean; results: CiStepResult[] } {
  const results: CiStepResult[] = []

  for (const step of steps) {
    onEvent?.({ type: 'ci_start', step: step.name, command: step.command })

    const startTime = Date.now()
    const result = spawnSync(step.command, {
      cwd,
      encoding: 'utf8',
      timeout: 120000, // 2分/ステップ
      shell: true,
    })
    const durationMs = Date.now() - startTime

    const success = result.status === 0
    const output = (result.stdout ?? '') + (result.stderr ?? '')

    results.push({ step, success, output, durationMs })
    onEvent?.({ type: 'ci_result', step: step.name, success, output, durationMs })

    if (!success) {
      return { success: false, results }
    }
  }

  return { success: true, results }
}
