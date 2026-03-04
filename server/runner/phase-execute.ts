import type { Task, CognacConfig, TaskEvent } from '@cognac/shared'
import { callClaude } from './claude-caller.js'
import { StreamParser } from './stream-parser.js'

// ブートストラップ用のPhase 3実行プロンプトを構築する
// Phase 2はスキップなので、タスク情報から直接プロンプトを組み立てる
function buildExecutionPrompt(task: Task): string {
  return `以下のタスクを実装してくれ。

## タスク
**タイトル**: ${task.title}
**説明**: ${task.description ?? '（説明なし）'}

## 指示
- 実装が完了したらgit commitしといて
- コミットメッセージの形式は自由でOK
- テストがあるならテストも書いて
`
}

// Phase 3を実行する
// executionPrompt が渡されたらそのまま使用（フルパイプラインモード）
// 渡されなければ buildExecutionPrompt でフォールバック（ブートストラップモード）
export async function executePhase3(
  task: Task,
  config: CognacConfig,
  onEvent?: (event: TaskEvent) => void,
  executionPrompt?: string,
): Promise<{ sessionId: string; tokenInput: number; tokenOutput: number; durationMs: number }> {
  const prompt = executionPrompt ?? buildExecutionPrompt(task)
  const parser = new StreamParser()

  const response = await callClaude(
    {
      prompt,
      maxTurns: config.claude.maxTurnsExecution,
      dangerouslySkipPermissions: true,
      onStream: (chunk) => {
        const line = JSON.stringify(chunk)
        const event = parser.parse(line)
        if (event) {
          onEvent?.(event)
        }
      },
    },
    config,
  )

  return {
    sessionId: response.sessionId,
    tokenInput: response.usage.inputTokens,
    tokenOutput: response.usage.outputTokens,
    durationMs: response.durationMs,
  }
}
