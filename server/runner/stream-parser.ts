/**
 * B-07: Claude Code stream-json 出力パーサー
 *
 * `claude -p --output-format stream-json` の各行JSONをパースし、
 * TaskEvent に変換する。
 * 不明なチャンクタイプはスキップ（warn出すだけ、throwしない）。
 */

import type { TaskEvent } from '@cognac/shared'

// ── Claude CLIが吐くstream-jsonの型 ──

/** ストリームの各行（生JSON） */
export type StreamChunk =
  | AssistantChunk
  | ResultChunk
  | SystemChunk
  | Record<string, unknown>

interface AssistantChunk {
  type: 'assistant'
  message: {
    content: ContentBlock[]
    [key: string]: unknown
  }
}

interface ResultChunk {
  type: 'result'
  result: string
  session_id: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
  [key: string]: unknown
}

interface SystemChunk {
  type: 'system'
  [key: string]: unknown
}

type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

interface TextBlock {
  type: 'text'
  text: string
}

interface ToolUseBlock {
  type: 'tool_use'
  name: string
  input: Record<string, unknown>
}

interface ToolResultBlock {
  type: 'tool_result'
  content: string
  is_error?: boolean
}

// ── パーサー結果の内部バッファ ──

interface ParsedResult {
  result: string
  sessionId: string
  usage: { inputTokens: number; outputTokens: number }
}

// ── StreamParser 本体 ──

export class StreamParser {
  /** result チャンクの中身を保持 */
  private resultData: ParsedResult | null = null

  /** 直前のツール名（tool_result を結合するため） */
  private lastToolName: string | null = null

  /**
   * 1行分のJSONをパースして TaskEvent を返す。
   * 該当なし or 不明タイプなら null。
   */
  parse(line: string): TaskEvent | null {
    if (!line.trim()) return null

    let chunk: StreamChunk
    try {
      chunk = JSON.parse(line) as StreamChunk
    } catch {
      console.warn('[StreamParser] JSONパース失敗、スキップ:', line.slice(0, 100))
      return null
    }

    const type = (chunk as Record<string, unknown>).type as string | undefined

    switch (type) {
      case 'assistant':
        return this.handleAssistant(chunk as AssistantChunk)

      case 'result':
        return this.handleResult(chunk as ResultChunk)

      case 'user':
      case 'system':
        // user / system メッセージは表示不要
        return null

      default:
        console.warn(`[StreamParser] 不明なチャンクタイプ: ${type ?? 'undefined'}`)
        return null
    }
  }

  /** result チャンクが来ていたらその内容を返す */
  getResult(): ParsedResult | null {
    return this.resultData
  }

  // ── 内部ハンドラ ──

  private handleAssistant(chunk: AssistantChunk): TaskEvent | null {
    const blocks = chunk.message?.content
    if (!blocks || blocks.length === 0) return null

    // 複数ブロックがある場合、最初の意味のあるイベントを返す
    for (const block of blocks) {
      const event = this.blockToEvent(block)
      if (event) return event
    }

    return null
  }

  private blockToEvent(block: ContentBlock): TaskEvent | null {
    switch (block.type) {
      case 'text':
        this.lastToolName = null
        return {
          type: 'claude_output',
          content: (block as TextBlock).text,
        }

      case 'tool_use':
        return this.handleToolUse(block as ToolUseBlock)

      case 'tool_result':
        // tool_result は単体ではイベント化しない（呼び出し元のツール結果として統合）
        return null

      default:
        console.warn(`[StreamParser] 不明なブロックタイプ: ${(block as Record<string, unknown>).type}`)
        return null
    }
  }

  private handleToolUse(block: ToolUseBlock): TaskEvent | null {
    const { name, input } = block
    this.lastToolName = name

    // ファイル変更系
    if (name === 'Write' || name === 'Edit') {
      const filePath = (input.file_path as string) ?? (input.path as string) ?? ''
      return {
        type: 'file_changed',
        path: filePath,
        toolName: name as 'Write' | 'Edit',
      }
    }

    // コマンド実行
    if (name === 'Bash') {
      const command = (input.command as string) ?? ''
      return {
        type: 'command_executed',
        command,
        output: '', // 実際の出力は tool_result で来るが、ここでは空
        exitCode: 0,
      }
    }

    // その他のツール（Read, Glob, Grep など）は claude_output として扱う
    return {
      type: 'claude_output',
      content: `[Tool: ${name}]`,
    }
  }

  private handleResult(chunk: ResultChunk): TaskEvent | null {
    this.resultData = {
      result: chunk.result ?? '',
      sessionId: chunk.session_id ?? '',
      usage: {
        inputTokens: chunk.usage?.input_tokens ?? 0,
        outputTokens: chunk.usage?.output_tokens ?? 0,
      },
    }

    // result 自体は TaskEvent として返さない（呼び出し元が getResult() で取る）
    return null
  }
}
