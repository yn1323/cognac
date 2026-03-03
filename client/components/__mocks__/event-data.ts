// ストーリー用のモックイベントデータ

import type { TaskEvent } from '@cognac/shared'

export const MOCK_EVENTS: TaskEvent[] = [
  { type: 'phase_start', phase: 'persona', timestamp: '2026-03-01T10:00:00.000Z' },
  { type: 'phase_end', phase: 'persona', timestamp: '2026-03-01T10:00:03.000Z', durationMs: 3200 },
  { type: 'phase_start', phase: 'execute', timestamp: '2026-03-01T10:00:05.000Z' },
  { type: 'claude_output', content: 'JWT認証のミドルウェアを実装します。まずはHonoのミドルウェア関数を作成...' },
  { type: 'file_changed', path: 'server/middleware/auth.ts', toolName: 'Write' },
  { type: 'command_executed', command: 'pnpm test', output: 'Tests passed', exitCode: 0 },
  { type: 'ci_start', step: 'typecheck', command: 'pnpm typecheck' },
  { type: 'ci_result', step: 'typecheck', success: true, output: '', durationMs: 1500 },
  { type: 'ci_result', step: 'test', success: false, output: 'FAIL src/auth.test.ts', durationMs: 4200 },
  { type: 'retry', errorType: 'app', count: 1, maxRetries: 5, reason: 'テスト失敗' },
  { type: 'error', errorType: 'infra', message: 'Claude API rate limit' },
  {
    type: 'completed',
    summary: '認証機能の実装完了',
    totalDurationMs: 120000,
    tokenUsage: { input: 5000, output: 3000 },
  },
]
