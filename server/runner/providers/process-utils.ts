/**
 * CLIプロバイダー共通ユーティリティ
 *
 * tmpファイル管理、プロセスセットアップなど、
 * Claude / Codex 両プロバイダーで共有するヘルパーを集約。
 */

import { type ChildProcess } from 'node:child_process'
import { createReadStream, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { ProcessTimeoutError } from './types.js'

// ── 共通トーンルール（全プロンプトに自動注入） ──
export const TONE_RULES = `
- 出力はすべて日本語
- コード内のコメントも日本語
- 変数名・関数名・ファイル名・型名は英語
- 敬語禁止。カジュアルなタメ口で
`.trim()

// ── tmpファイル管理 ──

const TMP_DIR = path.resolve('.cognac', 'tmp')

export interface TmpFiles {
  promptFile: string
  systemFile: string | null
}

export function writeTmpFiles(prompt: string, systemPrompt?: string): TmpFiles {
  mkdirSync(TMP_DIR, { recursive: true })
  const now = Date.now()
  const promptFile = path.join(TMP_DIR, `prompt-${now}.md`)
  const systemFile = systemPrompt
    ? path.join(TMP_DIR, `system-${now}.md`)
    : null

  writeFileSync(promptFile, prompt, 'utf8')
  if (systemFile && systemPrompt) {
    writeFileSync(systemFile, `${systemPrompt}\n\n${TONE_RULES}`, 'utf8')
  }
  return { promptFile, systemFile }
}

export function cleanupTmpFiles({ promptFile, systemFile }: TmpFiles): void {
  try { unlinkSync(promptFile) } catch { /* ok */ }
  if (systemFile) {
    try { unlinkSync(systemFile) } catch { /* ok */ }
  }
}

// ── プロセス共通ヘルパー ──

export interface SpawnHelpers {
  resetTimeout: () => void
  clearTimer: () => void
  getStderr: () => string
}

export function setupProcess(
  child: ChildProcess,
  promptFile: string,
  timeoutMs: number,
  reject: (reason: unknown) => void,
): SpawnHelpers {
  // stdin にプロンプトファイルを流し込む
  const promptStream = createReadStream(promptFile, 'utf8')
  promptStream.pipe(child.stdin!).on('error', (err: NodeJS.ErrnoException) => {
    // EPIPE はプロセスが先に閉じた場合に発生する。無視して OK
    if (err.code !== 'EPIPE') reject(err)
  })

  // stdout タイムアウト監視
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null

  const resetTimeout = (): void => {
    if (timeoutTimer) clearTimeout(timeoutTimer)
    timeoutTimer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGTERM')
        setTimeout(() => {
          if (child.exitCode === null) child.kill('SIGKILL')
        }, 5000)
      }
      reject(new ProcessTimeoutError(timeoutMs))
    }, timeoutMs)
  }

  // stderr バッファ
  let stderrBuf = ''
  child.stderr?.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString()
  })

  // エラーハンドリング
  child.on('error', (err: Error) => {
    if (timeoutTimer) clearTimeout(timeoutTimer)
    reject(err)
  })

  // 初回タイマー開始
  resetTimeout()

  return {
    resetTimeout,
    clearTimer: () => { if (timeoutTimer) clearTimeout(timeoutTimer) },
    getStderr: () => stderrBuf,
  }
}
