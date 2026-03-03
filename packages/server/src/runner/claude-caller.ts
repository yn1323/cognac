/**
 * B-06: Claude Code CLIの呼び出しヘルパー
 *
 * claude -p --output-format stream-json でClaude Codeを起動し、
 * ストリーム出力を逐次パースして返す。
 * タイムアウト管理、tmpファイルの後始末もここで面倒を見る。
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { createReadStream, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import path from 'node:path'
import type { SolitaryCodingConfig } from '@solitary-coding/shared'
import { StreamParser, type StreamChunk } from './stream-parser.js'

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
  onStream?: (chunk: StreamChunk) => void
}

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

// ── tmpディレクトリ ──

const TMP_DIR = path.resolve('.solitary-coding', 'tmp')

function ensureTmpDir(): void {
  mkdirSync(TMP_DIR, { recursive: true })
}

// ── メイン関数 ──

export async function callClaude(
  options: CallClaudeOptions,
  config: SolitaryCodingConfig,
): Promise<ClaudeResponse> {
  ensureTmpDir()

  const now = Date.now()
  const promptFile = path.join(TMP_DIR, `prompt-${now}.md`)
  const systemFile = options.systemPrompt
    ? path.join(TMP_DIR, `system-${now}.md`)
    : null

  // tmpファイル書き出し
  writeFileSync(promptFile, options.prompt, 'utf8')

  // システムプロンプトにトーンルールを自動注入
  if (systemFile) {
    const fullSystem = `${options.systemPrompt}\n\n${TONE_RULES}`
    writeFileSync(systemFile, fullSystem, 'utf8')
  }

  // CLI引数を組み立て
  const args = ['-p', '--output-format', 'stream-json']

  if (systemFile) {
    args.push('--append-system-prompt-file', systemFile)
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
  let child: ChildProcess | null = null

  try {
    const response = await new Promise<ClaudeResponse>((resolve, reject) => {
      // プロセス起動
      child = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      const parser = new StreamParser()
      let result = ''
      let sessionId = ''
      let usage = { inputTokens: 0, outputTokens: 0 }

      // stdin にプロンプトファイルを流し込む
      const promptStream = createReadStream(promptFile, 'utf8')
      promptStream.pipe(child.stdin!).on('error', (err: NodeJS.ErrnoException) => {
        // EPIPE はプロセスが先に閉じた場合に発生する。無視して OK
        if (err.code !== 'EPIPE') {
          reject(err)
        }
      })

      // stdout タイムアウト監視
      const timeoutMs = config.claude.stdoutTimeoutMs
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null

      const resetTimeout = (): void => {
        if (timeoutTimer) clearTimeout(timeoutTimer)
        timeoutTimer = setTimeout(() => {
          // タイムアウト発火 → SIGTERM → 5秒後に SIGKILL
          if (child && child.exitCode === null) {
            child.kill('SIGTERM')
            setTimeout(() => {
              if (child && child.exitCode === null) {
                child.kill('SIGKILL')
              }
            }, 5000)
          }
          reject(new ProcessTimeoutError(timeoutMs))
        }, timeoutMs)
      }

      // 初回タイマー開始
      resetTimeout()

      // stdout を行単位でパース
      const rl = createInterface({ input: child.stdout! })

      rl.on('line', (line: string) => {
        // 行が来るたびタイマーリセット
        resetTimeout()

        const parsed = parser.parse(line)
        if (!parsed) return

        // ストリームコールバック
        if (options.onStream) {
          // StreamChunk として渡すために生のJSONパース結果も渡す
          try {
            const raw = JSON.parse(line) as StreamChunk
            options.onStream(raw)
          } catch {
            // パース失敗は無視
          }
        }

        // result イベントからレスポンスを抽出
        if (parsed.type === 'claude_output') {
          result += parsed.content
        }

        // StreamParser が内部で保持した result 情報を使う
        const parserResult = parser.getResult()
        if (parserResult) {
          result = parserResult.result
          sessionId = parserResult.sessionId
          usage = parserResult.usage
        }
      })

      // stderr はログに出す
      let stderrBuf = ''
      child.stderr?.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString()
      })

      // プロセス終了
      child.on('close', (code: number | null) => {
        if (timeoutTimer) clearTimeout(timeoutTimer)

        // パーサーから最終結果を取得
        const finalResult = parser.getResult()
        if (finalResult) {
          result = finalResult.result
          sessionId = finalResult.sessionId
          usage = finalResult.usage
        }

        const durationMs = Date.now() - startTime

        if (code !== 0 && !result) {
          reject(
            new Error(
              `Claude プロセスが exit code ${code} で終了した: ${stderrBuf.slice(0, 500)}`,
            ),
          )
          return
        }

        resolve({
          result,
          sessionId,
          usage,
          durationMs,
        })
      })

      child.on('error', (err: Error) => {
        if (timeoutTimer) clearTimeout(timeoutTimer)
        reject(err)
      })
    })

    return response
  } finally {
    // tmpファイルの後始末
    try {
      unlinkSync(promptFile)
    } catch {
      // 消せなくても問題なし
    }
    if (systemFile) {
      try {
        unlinkSync(systemFile)
      } catch {
        // 消せなくても問題なし
      }
    }
  }
}
