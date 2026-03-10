import type { AgentStreamEvent, CognacConfig, Task, TaskEvent } from '@cognac/shared'
import { createProvider } from './providers/index.js'

// Phase 3用システムプロンプト
// 自律実行の制約を明示（Claude/Codex両プロバイダーで有効）
function buildSystemPrompt(): string {
  return `## 重要な制約
- AskUserQuestionツールは絶対に使わないこと。この環境ではユーザーとの対話はできない。
- 判断に迷う場合は、最も妥当と思われるアプローチを自分で選んで実装を進めること。
- 質問や確認をせず、黙々とコードを書いて完成させること。`
}

// ブートストラップ用のPhase 3実行プロンプトを構築する
// Phase 2はスキップなので、タスク情報から直接プロンプトを組み立てる
// 一時コメントアウト: git commit指示を除去（不具合調査のノイズ除去）
// 元の指示: 「実装が完了したらgit commitしといて」「コミットメッセージの形式は自由でOK」
function buildExecutionPrompt(task: Task): string {
  return `以下のタスクを実装してくれ。

## タスク
**タイトル**: ${task.title}
**説明**: ${task.description ?? '（説明なし）'}

## 指示
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
  signal?: AbortSignal,
): Promise<{ sessionId: string; tokenInput: number; tokenOutput: number; durationMs: number }> {
  const prompt = executionPrompt ?? buildExecutionPrompt(task)
  const onStream = onEvent
    ? (event: AgentStreamEvent): void => {
        if (event.type === 'agent_output') {
          onEvent({ type: 'claude_output', content: event.content })
          return
        }
        onEvent(event)
      }
    : undefined

  const provider = createProvider(config.provider)
  const response = await provider.execStream(
    {
      prompt,
      systemPrompt: buildSystemPrompt(),
      maxTurns: config.claude.maxTurnsExecution,
      dangerouslySkipPermissions: true,
      onStream,
      signal,
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
