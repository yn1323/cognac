/**
 * B-06: Claude Code CLIの呼び出しヘルパー
 *
 * 2つのモードを提供:
 * - callClaude(): stream-json モード（Phase 3 実行用、リアルタイムストリーミング）
 * - callClaudePrint(): --print モード（Phase 2 用、プレーンテキスト出力）
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { createReadStream, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import path from 'node:path'
import type { CognacConfig, TaskEvent } from '@cognac/shared'
import { StreamParser } from './stream-parser.js'

// ── 共通トーンルール（全プロンプトに自動注入） ──
const TONE_RULES = `
- 出力はすべて日本語
- コード内のコメントも日本語
- 変数名・関数名・ファイル名・型名は英語
- 敬語禁止。カジュアルなタメ口で
`.trim()

// ── 型定義 ──

export interface CallClaudeOptions {
  prompt: string
  systemPrompt?: string
  sessionId?: string
  maxTurns?: number
  allowedTools?: string[]
  dangerouslySkipPermissions?: boolean
  onStream?: (event: TaskEvent) => void
}

export type CallClaudePrintOptions = Omit<
  CallClaudeOptions,
  'allowedTools' | 'dangerouslySkipPermissions' | 'onStream' | 'maxTurns'
>

export interface ClaudeResponse {
  result: string
  sessionId: string
  usage: { inputTokens: number; outputTokens: number }
  durationMs: number
}

/**
 * プロセスタイムアウト用エラー
 * 呼び出し元で errorType: 'process' として扱うためのマーカー。
 */
export class ProcessTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Claude プロセスが ${timeoutMs}ms 応答なしでタイムアウトした`)
    this.name = 'ProcessTimeoutError'
  }
}

// ── tmpファイル管理 ──

const TMP_DIR = path.resolve('.cognac', 'tmp')

interface TmpFiles {
  promptFile: string
  systemFile: string | null
}

function writeTmpFiles(prompt: string, systemPrompt?: string): TmpFiles {
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

function cleanupTmpFiles({ promptFile, systemFile }: TmpFiles): void {
  try { unlinkSync(promptFile) } catch { /* ok */ }
  if (systemFile) {
    try { unlinkSync(systemFile) } catch { /* ok */ }
  }
}

// ── プロセス共通ヘルパー ──

interface SpawnHelpers {
  resetTimeout: () => void
  clearTimer: () => void
  getStderr: () => string
}

function setupProcess(
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

// ── callClaude: stream-json モード（Phase 3 実行用） ──

export async function callClaude(
  options: CallClaudeOptions,
  config: CognacConfig,
): Promise<ClaudeResponse> {
  const tmpFiles = writeTmpFiles(options.prompt, options.systemPrompt)

  // CLI引数を組み立て
  const args = ['-p', '--output-format', 'stream-json', '--verbose']

  if (tmpFiles.systemFile) {
    args.push('--append-system-prompt-file', tmpFiles.systemFile)
  }
  if (options.sessionId) {
    args.push('--session-id', options.sessionId)
  }
  if (options.maxTurns !== undefined) {
    args.push('--max-turns', String(options.maxTurns))
  }
  if (options.allowedTools && options.allowedTools.length > 0) {
    for (const tool of options.allowedTools) {
      args.push('--allowedTools', tool)
    }
  }
  if (options.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions')
  }

  const startTime = Date.now()
  console.log(`[callClaude] 起動: claude ${args.join(' ')}`)
  console.log(`[callClaude] プロンプトファイル: ${tmpFiles.promptFile}`)
  if (tmpFiles.systemFile) console.log(`[callClaude] システムファイル: ${tmpFiles.systemFile}`)

  try {
    return await new Promise<ClaudeResponse>((resolve, reject) => {
      const child = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      })

      console.log(`[callClaude] プロセス起動 PID=${child.pid}`)

      const { resetTimeout, clearTimer, getStderr } = setupProcess(
        child, tmpFiles.promptFile, config.claude.stdoutTimeoutMs, reject,
      )

      const parser = new StreamParser()
      let result = ''
      let lineCount = 0

      // stdout を行単位でパース
      const rl = createInterface({ input: child.stdout! })

      rl.on('line', (line: string) => {
        lineCount++
        resetTimeout()

        const parsed = parser.parse(line)
        if (!parsed) return

        // ストリームコールバック（TaskEvent を直接渡す）
        options.onStream?.(parsed)

        // claude_output テキストをフォールバック用に蓄積
        if (parsed.type === 'claude_output') {
          result += parsed.content
        }
      })

      // プロセス終了
      child.on('close', (code: number | null) => {
        clearTimer()

        // パーサーから最終結果を取得
        const finalResult = parser.getResult()
        const sessionId = finalResult?.sessionId ?? ''
        const usage = finalResult?.usage ?? { inputTokens: 0, outputTokens: 0 }
        if (finalResult?.result) {
          result = finalResult.result
        }

        const durationMs = Date.now() - startTime
        const stderr = getStderr()

        console.log(`[callClaude] プロセス終了 code=${code} lines=${lineCount} result=${result.length}文字 duration=${durationMs}ms`)
        if (stderr) console.log(`[callClaude] stderr:\n${stderr}`)

        if (code !== 0 && !result) {
          reject(new Error(
            `Claude プロセスが exit code ${code} で終了した: ${stderr.slice(0, 500)}`,
          ))
          return
        }

        resolve({ result, sessionId, usage, durationMs })
      })
    })
  } finally {
    cleanupTmpFiles(tmpFiles)
  }
}

// ── callClaudePrint: --print モード（Phase 2 用） ──

/**
 * claude --print でプレーンテキスト出力を取得する。
 * Phase 2（ペルソナ選定・ディスカッション・プラン策定）向け。
 * stream-json を使わないのでJSONパースエラーが発生しない。
 */
export async function callClaudePrint(
  options: CallClaudePrintOptions,
  config: CognacConfig,
): Promise<ClaudeResponse> {
  const tmpFiles = writeTmpFiles(options.prompt, options.systemPrompt)

  const args = ['--print']

  if (tmpFiles.systemFile) {
    args.push('--append-system-prompt-file', tmpFiles.systemFile)
  }
  if (options.sessionId) {
    args.push('--session-id', options.sessionId)
  }
  // --print モードでは --max-turns を渡さない
  // Claude が必要なだけツール（Read, Grep等）を使って最終回答を返す

  const startTime = Date.now()
  console.log(`[callClaudePrint] 起動: claude ${args.join(' ')}`)
  console.log(`[callClaudePrint] プロンプトファイル: ${tmpFiles.promptFile}`)
  if (tmpFiles.systemFile) console.log(`[callClaudePrint] システムファイル: ${tmpFiles.systemFile}`)

  try {
    return await new Promise<ClaudeResponse>((resolve, reject) => {
      const child = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      })

      console.log(`[callClaudePrint] プロセス起動 PID=${child.pid}`)

      const { resetTimeout, clearTimer, getStderr } = setupProcess(
        child, tmpFiles.promptFile, config.claude.stdoutTimeoutMs, reject,
      )

      // stdout をバッファとして蓄積（行単位JSONパース不要）
      const chunks: Buffer[] = []
      let totalBytes = 0
      child.stdout?.on('data', (chunk: Buffer) => {
        resetTimeout()
        chunks.push(chunk)
        totalBytes += chunk.length
      })

      child.on('close', (code: number | null) => {
        clearTimer()
        const stdout = Buffer.concat(chunks).toString('utf8')
        const durationMs = Date.now() - startTime
        const stderr = getStderr()

        console.log(`[callClaudePrint] プロセス終了 code=${code} stdout=${totalBytes}bytes duration=${durationMs}ms`)
        if (stderr) console.log(`[callClaudePrint] stderr:\n${stderr}`)
        console.log(`[callClaudePrint] stdout全文:\n${stdout}`)

        if (code !== 0 && !stdout.trim()) {
          reject(new Error(
            `Claude プロセスが exit code ${code} で終了した: ${stderr.slice(0, 500)}`,
          ))
          return
        }

        resolve({
          result: stdout,
          sessionId: '',
          usage: { inputTokens: 0, outputTokens: 0 },
          durationMs,
        })
      })
    })
  } finally {
    cleanupTmpFiles(tmpFiles)
  }
}
