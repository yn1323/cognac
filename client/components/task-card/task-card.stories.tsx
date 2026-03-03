// TaskCard のストーリー
// 各ステータス・説明あり/なしのパターン

import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { TaskCard } from './task-card'
import { MOCK_TASKS, ALL_STATUSES } from '../__mocks__/task-data'
import { fn } from '@storybook/test'

const meta: Meta<typeof TaskCard> = {
  title: 'Components/TaskCard',
  component: TaskCard,
  tags: ['autodocs'],
  decorators: [
    // react-router の Link を使ってるから MemoryRouter で囲む
    (Story) => (
      <MemoryRouter>
        <div className="max-w-md">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    onRetry: fn(),
  },
}
export default meta

type Story = StoryObj<typeof meta>

export const Pending: Story = {
  args: { task: MOCK_TASKS.pending },
}

export const Executing: Story = {
  args: { task: MOCK_TASKS.executing },
}

export const Completed: Story = {
  args: { task: MOCK_TASKS.completed },
}

export const Stopped: Story = {
  args: { task: MOCK_TASKS.stopped },
}

export const WithDescription: Story = {
  args: {
    task: {
      ...MOCK_TASKS.executing,
      description:
        'JWTトークンの検証ミドルウェアを追加。有効期限切れ時の自動リフレッシュロジックも含む。',
    },
  },
}

// 全ステータス一覧表示
export const AllStatuses: Story = {
  args: { task: MOCK_TASKS.pending },
  render: (args) => (
    <div className="space-y-3">
      {ALL_STATUSES.map((status) => (
        <TaskCard key={status} task={MOCK_TASKS[status]} onRetry={args.onRetry} />
      ))}
    </div>
  ),
}
