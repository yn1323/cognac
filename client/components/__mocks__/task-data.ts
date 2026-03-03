// ストーリー用のモックデータ

import type { Task, TaskStatus } from '@cognac/shared'

// 全ステータスの一覧
export const ALL_STATUSES: TaskStatus[] = [
  'pending',
  'discussing',
  'planned',
  'executing',
  'testing',
  'completed',
  'paused',
  'stopped',
]

// サンプルタスクを生成するヘルパー
export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: '認証機能の実装',
    description: 'JWT認証を実装して、ログイン・ログアウトのAPIを追加する',
    status: 'pending',
    priority: 1,
    queue_order: 1,
    branch_name: null,
    retry_count: 0,
    process_retry_count: 0,
    paused_reason: null,
    paused_phase: null,
    created_at: '2026-03-01T10:00:00.000Z',
    started_at: null,
    completed_at: null,
    ...overrides,
  }
}

// 各ステータスのサンプルタスク
export const MOCK_TASKS: Record<TaskStatus, Task> = {
  pending: createMockTask({
    id: 1,
    status: 'pending',
    title: '認証機能の実装',
  }),
  discussing: createMockTask({
    id: 2,
    status: 'discussing',
    title: 'API設計の議論',
    started_at: '2026-03-01T11:00:00.000Z',
  }),
  planned: createMockTask({
    id: 3,
    status: 'planned',
    title: 'DBスキーマの変更',
  }),
  executing: createMockTask({
    id: 4,
    status: 'executing',
    title: 'フロントエンドの修正',
    branch_name: 'task/4-frontend-fix',
    started_at: '2026-03-01T12:00:00.000Z',
  }),
  testing: createMockTask({
    id: 5,
    status: 'testing',
    title: 'テスト追加',
    started_at: '2026-03-01T13:00:00.000Z',
  }),
  completed: createMockTask({
    id: 6,
    status: 'completed',
    title: 'バグ修正',
    started_at: '2026-03-01T14:00:00.000Z',
    completed_at: '2026-03-01T15:00:00.000Z',
  }),
  paused: createMockTask({
    id: 7,
    status: 'paused',
    title: 'ネットワークエラー',
    paused_reason: 'rate limit exceeded',
    paused_phase: 'execute',
  }),
  stopped: createMockTask({
    id: 8,
    status: 'stopped',
    title: 'CI失敗',
    retry_count: 5,
  }),
}
