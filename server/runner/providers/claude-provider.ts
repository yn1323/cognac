/**
 * Claude Code CLI プロバイダー
 *
 * `claude -p --output-format stream-json` (Phase 3) と
 * `claude --print` (Phase 2 / Git AI) の2モードを提供する。
 */

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { CognacConfig } from '@cognac/shared'
import { StreamParser } from '../stream-parser.js'
import type { CliProviderInterface, CliResponse, StreamExecOptions, PrintExecOptions } from './types.js'
import { TaskCancelledError } from './types.js'
import { writeTmpFiles, cleanupTmpFiles, setupAbortHandler, setupProcess } from './process-utils.js'

// Claude Code は CLAUDECODE 環境変数をセットするため、
// 子プロセスで再度 claude を起動すると「ネストされたセッション」と判定されてしまう。
// process.env は実行中変化しないのでキャッシュする。
let cachedCleanEnv: NodeJS.ProcessEnv | null = null
function getCleanEnv(): NodeJS.ProcessEnv {
  if (!cachedCleanEnv) {
    cachedCleanEnv = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => key !== 'CLAUDECODE' && !key.startsWith('CLAUDE_CODE_'),
      ),
    ) as NodeJS.ProcessEnv
  }
  return cachedCleanEnv
}

export class ClaudeProvider implements CliProviderInterface {
  readonly name = 'claude'

  async execStream(options: StreamExecOptions, config: CognacConfig): Promise<CliResponse> {
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
    console.log(`[ClaudeProvider] 起動: claude ${args.join(' ')}`)

    try {
      return await new Promise<CliResponse>((resolve, reject) => {
        if (options.signal?.aborted) {
          reject(new TaskCancelledError())
          return
        }

        const child = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          env: getCleanEnv(),
        })

        console.log(`[ClaudeProvider] プロセス起動 PID=${child.pid}`)

        const { resetTimeout, clearTimer, getStderr } = setupProcess(
          child, tmpFiles.promptFile, config.claude.stdoutTimeoutMs, reject,
        )

        const onAbort = setupAbortHandler(child, options.signal, clearTimer, reject, 'ClaudeProvider')

        const parser = new StreamParser()
        let result = ''
        let lineCount = 0

        const rl = createInterface({ input: child.stdout! })

        rl.on('line', (line: string) => {
          lineCount++
          resetTimeout()

          const parsed = parser.parse(line)
          if (!parsed) return

          options.onStream?.(parsed)

          if (parsed.type === 'agent_output') {
            result += parsed.content
          }
        })

        child.on('close', (code: number | null) => {
          clearTimer()
          options.signal?.removeEventListener('abort', onAbort)

          const finalResult = parser.getResult()
          const sessionId = finalResult?.sessionId ?? ''
          const usage = finalResult?.usage ?? { inputTokens: 0, outputTokens: 0 }
          if (finalResult?.result) {
            result = finalResult.result
          }

          const durationMs = Date.now() - startTime
          const stderr = getStderr()

          console.log(`[ClaudeProvider] プロセス終了 code=${code} lines=${lineCount} result=${result.length}文字 duration=${durationMs}ms`)
          if (stderr) console.log(`[ClaudeProvider] stderr:\n${stderr}`)

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

  async execPrint(options: PrintExecOptions, config: CognacConfig): Promise<CliResponse> {
    const tmpFiles = writeTmpFiles(options.prompt, options.systemPrompt)

    const args = ['--print']

    if (tmpFiles.systemFile) {
      args.push('--append-system-prompt-file', tmpFiles.systemFile)
    }
    if (options.sessionId) {
      args.push('--session-id', options.sessionId)
    }

    const startTime = Date.now()
    console.log(`[ClaudeProvider] 起動: claude ${args.join(' ')}`)

    try {
      return await new Promise<CliResponse>((resolve, reject) => {
        if (options.signal?.aborted) {
          reject(new TaskCancelledError())
          return
        }

        const child = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          env: getCleanEnv(),
        })

        console.log(`[ClaudeProvider] プロセス起動 PID=${child.pid}`)

        const { resetTimeout, clearTimer, getStderr } = setupProcess(
          child, tmpFiles.promptFile, config.claude.stdoutTimeoutMs, reject,
        )

        const onAbort = setupAbortHandler(child, options.signal, clearTimer, reject, 'ClaudeProvider')

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

          console.log(`[ClaudeProvider] プロセス終了 code=${code} stdout=${totalBytes}bytes duration=${durationMs}ms`)
          if (stderr) console.log(`[ClaudeProvider] stderr:\n${stderr}`)

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
}
