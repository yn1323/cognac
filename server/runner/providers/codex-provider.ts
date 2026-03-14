/**
 * Codex CLI プロバイダー
 *
 * `codex exec --json` (Phase 3) と
 * `codex exec` (Phase 2 / Git AI) の2モードを提供する。
 */

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { CognacConfig } from '@cognac/shared'
import { CodexStreamParser } from './codex-stream-parser.js'
import {
  cleanupTmpFiles,
  setupAbortHandler,
  setupProcess,
  TONE_RULES,
  writeTmpFiles,
} from './process-utils.js'
import type {
  CliProviderInterface,
  CliResponse,
  PrintExecOptions,
  StreamExecOptions,
} from './types.js'
import { TaskCancelledError } from './types.js'

/**
 * Codex はシステムプロンプト用の専用フラグがないため、
 * プロンプト本文の先頭にシステム指示を埋め込む。
 */
function buildPromptWithSystem(prompt: string, systemPrompt?: string): string {
  if (!systemPrompt) return `${TONE_RULES}\n\n---\n\n${prompt}`
  return `===== 最重要指示（以下を厳守すること） =====\n${systemPrompt}\n\n${TONE_RULES}\n===== 最重要指示ここまで =====\n\n---\n\n${prompt}`
}

export class CodexProvider implements CliProviderInterface {
  readonly name = 'codex'

  async execStream(options: StreamExecOptions, config: CognacConfig): Promise<CliResponse> {
    const fullPrompt = buildPromptWithSystem(options.prompt, options.systemPrompt)
    const tmpFiles = writeTmpFiles(fullPrompt)
    const executionMode = options.executionMode ?? 'write'

    // CLI引数を組み立て
    const args = ['exec', '--json', '--ephemeral']

    if (executionMode === 'read-only') {
      args.push('-s', 'read-only')
    } else if (options.dangerouslySkipPermissions) {
      args.push('--dangerously-bypass-approvals-and-sandbox')
    } else {
      args.push('--full-auto')
    }

    // stdin からプロンプトを読む
    args.push('-')

    const startTime = Date.now()
    console.log(`[CodexProvider] 起動: codex ${args.join(' ')}`)

    try {
      return await new Promise<CliResponse>((resolve, reject) => {
        if (options.signal?.aborted) {
          reject(new TaskCancelledError())
          return
        }

        const child = spawn('codex', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          env: process.env,
        })

        console.log(`[CodexProvider] プロセス起動 PID=${child.pid}`)

        const { resetTimeout, clearTimer, getStderr } = setupProcess(
          child,
          tmpFiles.promptFile,
          config.claude.stdoutTimeoutMs,
          reject,
        )

        const onAbort = setupAbortHandler(
          child,
          options.signal,
          clearTimer,
          reject,
          'CodexProvider',
        )

        const parser = new CodexStreamParser()
        let lineCount = 0

        // biome-ignore lint/style/noNonNullAssertion: stdio: ['pipe','pipe','pipe'] で必ず存在する
        const rl = createInterface({ input: child.stdout! })

        rl.on('line', (line: string) => {
          lineCount++
          resetTimeout()

          const parsed = parser.parse(line)
          if (!parsed) return

          options.onStream?.(parsed)
        })

        child.on('close', (code: number | null) => {
          clearTimer()
          options.signal?.removeEventListener('abort', onAbort)

          const finalResult = parser.getResult()
          const result = finalResult?.result ?? ''
          const sessionId = finalResult?.sessionId ?? ''
          const usage = finalResult?.usage ?? { inputTokens: 0, outputTokens: 0 }

          const durationMs = Date.now() - startTime
          const stderr = getStderr()

          console.log(
            `[CodexProvider] プロセス終了 code=${code} lines=${lineCount} result=${result.length}文字 duration=${durationMs}ms`,
          )
          if (stderr) console.log(`[CodexProvider] stderr:\n${stderr}`)

          if (code !== 0 && !result) {
            reject(
              new Error(`Codex プロセスが exit code ${code} で終了した: ${stderr.slice(0, 500)}`),
            )
            return
          }

          resolve({ result, sessionId, usage, durationMs })
        })
      })
    } finally {
      cleanupTmpFiles(tmpFiles)
    }
  }

  async execPrint(options: PrintExecOptions, config: CognacConfig): Promise<CliResponse> {
    const fullPrompt = buildPromptWithSystem(options.prompt, options.systemPrompt)
    const tmpFiles = writeTmpFiles(fullPrompt)

    // テキスト出力モード: --json なし、read-only サンドボックス
    const args = ['exec', '--ephemeral', '-s', 'read-only', '-']

    const startTime = Date.now()
    console.log(`[CodexProvider] 起動: codex ${args.join(' ')}`)

    try {
      return await new Promise<CliResponse>((resolve, reject) => {
        if (options.signal?.aborted) {
          reject(new TaskCancelledError())
          return
        }

        const child = spawn('codex', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          env: process.env,
        })

        console.log(`[CodexProvider] プロセス起動 PID=${child.pid}`)

        const { resetTimeout, clearTimer, getStderr } = setupProcess(
          child,
          tmpFiles.promptFile,
          config.claude.stdoutTimeoutMs,
          reject,
        )

        const onAbort = setupAbortHandler(
          child,
          options.signal,
          clearTimer,
          reject,
          'CodexProvider',
        )

        // stdout をバッファとして蓄積
        const chunks: Buffer[] = []
        let totalBytes = 0
        child.stdout?.on('data', (chunk: Buffer) => {
          resetTimeout()
          chunks.push(chunk)
          totalBytes += chunk.length
        })

        child.on('close', (code: number | null) => {
          clearTimer()
          options.signal?.removeEventListener('abort', onAbort)
          const stdout = Buffer.concat(chunks).toString('utf8')
          const durationMs = Date.now() - startTime
          const stderr = getStderr()

          console.log(
            `[CodexProvider] プロセス終了 code=${code} stdout=${totalBytes}bytes duration=${durationMs}ms`,
          )
          if (stderr) console.log(`[CodexProvider] stderr:\n${stderr}`)

          if (code !== 0 && !stdout.trim()) {
            reject(
              new Error(`Codex プロセスが exit code ${code} で終了した: ${stderr.slice(0, 500)}`),
            )
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
}
