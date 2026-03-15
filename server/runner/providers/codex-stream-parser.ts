/**
 * Codex CLI JSONL 出力パーサー
 *
 * `codex exec --json` の各行JSONをパースし、AgentStreamEvent に変換する。
 * Claude の StreamParser と同じ parse() / getResult() インターフェース。
 */

import type { AgentStreamEvent } from '@cognac/shared'

// ── Codex JSONL イベント型 ──

interface CodexItem {
  id: string
  type: string
  text?: string
  command?: string
  aggregated_output?: string
  exit_code?: number | null
  status?: string
  changes?: Array<{ path: string; kind: string }>
  [key: string]: unknown
}

interface CodexEvent {
  type: string
  thread_id?: string
  item?: CodexItem
  usage?: {
    input_tokens: number
    cached_input_tokens?: number
    output_tokens: number
  }
  error?: { message: string }
  message?: string
  [key: string]: unknown
}

// ── パーサー結果 ──

interface ParsedResult {
  result: string
  sessionId: string
  usage: { inputTokens: number; outputTokens: number }
}

// ── CodexStreamParser 本体 ──

export class CodexStreamParser {
  private threadId = ''
  private lastAgentMessage = ''
  private totalUsage = { inputTokens: 0, outputTokens: 0 }
  /** レートリミットイベントを検知したか */
  private rateLimitDetected = false

  /**
   * 1行分のJSONをパースして AgentStreamEvent を返す。
   * 該当なし or 不明タイプなら null。
   */
  parse(line: string): AgentStreamEvent | null {
    if (!line.trim()) return null

    let event: CodexEvent
    try {
      event = JSON.parse(line) as CodexEvent
    } catch {
      console.warn('[CodexStreamParser] JSONパース失敗、スキップ:', line.slice(0, 100))
      return null
    }

    switch (event.type) {
      case 'thread.started':
        this.threadId = event.thread_id ?? ''
        return null

      case 'turn.started':
        return null

      case 'turn.completed':
        if (event.usage) {
          this.totalUsage.inputTokens += event.usage.input_tokens ?? 0
          this.totalUsage.outputTokens += event.usage.output_tokens ?? 0
        }
        return null

      case 'turn.failed': {
        const failMessage = event.error?.message ?? 'Codex CLIでターン失敗'
        if (/rate.limit|429|too many requests/i.test(failMessage)) {
          this.rateLimitDetected = true
        }
        return {
          type: 'error',
          errorType: 'infra',
          message: failMessage,
        }
      }

      case 'error':
        console.warn(`[CodexStreamParser] エラーイベント: ${event.message}`)
        if (/rate.limit|429|too many requests/i.test(event.message ?? '')) {
          this.rateLimitDetected = true
        }
        return {
          type: 'error' as const,
          errorType: 'infra' as const,
          message: event.message ?? 'Codex CLIでエラー発生',
        }

      case 'item.started':
        return this.handleItemStarted(event.item)

      case 'item.completed':
        return this.handleItemCompleted(event.item)

      default:
        return null
    }
  }

  /** 最終結果を返す */
  getResult(): ParsedResult | null {
    return {
      result: this.lastAgentMessage,
      sessionId: this.threadId,
      usage: { ...this.totalUsage },
    }
  }

  /** レートリミットイベントを検知したかどうか */
  isRateLimited(): boolean {
    return this.rateLimitDetected
  }

  // ── 内部ハンドラ ──

  private handleItemStarted(item?: CodexItem): AgentStreamEvent | null {
    if (!item) return null

    if (item.type === 'command_execution') {
      return {
        type: 'tool_invoked',
        toolName: 'Bash',
      }
    }

    return null
  }

  private handleItemCompleted(item?: CodexItem): AgentStreamEvent | null {
    if (!item) return null

    switch (item.type) {
      case 'agent_message':
        this.lastAgentMessage = item.text ?? ''
        return {
          type: 'agent_output',
          content: item.text ?? '',
        }

      case 'reasoning':
        // Codex の思考ブロック → ログのみ（Claude と同様にイベント化しない）
        return null

      case 'command_execution':
        return {
          type: 'command_executed',
          command: item.command ?? '',
          output: (item.aggregated_output ?? '').slice(0, 2000),
          exitCode: item.exit_code ?? 0,
        }

      case 'file_change': {
        // 最初の変更をイベントとして返す
        const change = item.changes?.[0]
        if (!change) return null
        // kind: "add" | "update" | "delete" → toolName: "Write" | "Edit"
        const toolName = change.kind === 'add' ? ('Write' as const) : ('Edit' as const)
        return {
          type: 'file_changed',
          path: change.path,
          toolName,
        }
      }

      case 'error':
        return {
          type: 'error',
          errorType: 'app',
          message: (item as CodexItem & { message?: string }).message ?? '不明なエラー',
        }

      default:
        return null
    }
  }
}
