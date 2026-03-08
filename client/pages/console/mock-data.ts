// コンソール画面のモックデータ

import type { ConsoleCommandListItem, ConsoleRun } from '@cognac/shared'

const runningRun: ConsoleRun = {
  id: 101,
  command_id: 1,
  status: 'running',
  pid: 42351,
  started_at: '2026-03-08T10:32:15Z',
  ended_at: null,
  exit_code: null,
  termination_reason: null,
  log_file_path: '/tmp/cognac/runs/101.log',
  created_at: '2026-03-08T10:32:15Z',
}

export const MOCK_COMMANDS: ConsoleCommandListItem[] = [
  {
    id: 1,
    name: 'Dev Server',
    command: 'pnpm dev',
    note: '開発サーバー起動',
    created_at: '2026-03-08T09:00:00Z',
    updated_at: '2026-03-08T09:00:00Z',
    latest_run: runningRun,
    active_run: runningRun,
    derived_status: 'running',
  },
  {
    id: 2,
    name: 'Storybook',
    command: 'pnpm storybook',
    note: null,
    created_at: '2026-03-08T08:00:00Z',
    updated_at: '2026-03-08T08:00:00Z',
    latest_run: {
      id: 102,
      command_id: 2,
      status: 'completed',
      pid: 41200,
      started_at: '2026-03-08T09:15:42Z',
      ended_at: '2026-03-08T09:45:00Z',
      exit_code: 0,
      termination_reason: null,
      log_file_path: '/tmp/cognac/runs/102.log',
      created_at: '2026-03-08T09:15:42Z',
    },
    active_run: null,
    derived_status: 'completed',
  },
  {
    id: 3,
    name: 'Test Watch',
    command: 'pnpm test --watch',
    note: 'テスト監視モード',
    created_at: '2026-03-08T07:00:00Z',
    updated_at: '2026-03-08T07:00:00Z',
    latest_run: {
      id: 103,
      command_id: 3,
      status: 'failed',
      pid: 40500,
      started_at: '2026-03-08T08:45:30Z',
      ended_at: '2026-03-08T08:50:00Z',
      exit_code: 1,
      termination_reason: null,
      log_file_path: '/tmp/cognac/runs/103.log',
      created_at: '2026-03-08T08:45:30Z',
    },
    active_run: null,
    derived_status: 'failed',
  },
  {
    id: 4,
    name: 'Lint Check',
    command: 'pnpm lint',
    note: null,
    created_at: '2026-03-08T06:00:00Z',
    updated_at: '2026-03-08T06:00:00Z',
    latest_run: null,
    active_run: null,
    derived_status: 'idle',
  },
]

export const MOCK_LOG_CONTENT = `$ pnpm dev

> @cognac/server dev
> tsup src/index.ts --watch

CLI Building entry: src/index.ts
CLI Using tsconfig: tsconfig.json
CLI tsup v8.4.0
CLI Target: es2022

ESM Build start
ESM dist/index.js 245.12 KB
ESM Build success in 892ms

> @cognac/client dev
> vite --port 5173

  VITE v6.2.0  ready in 1243 ms

  > Local:   http://localhost:5173/
  > Network: http://192.168.1.5:5173/
  > press h + enter to show help`
