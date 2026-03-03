// TaskDetail のストーリー
// react-router + React Query が必要

import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TaskDetail } from './task-detail'
import { MOCK_TASKS } from '../__mocks__/task-data'
import { MOCK_EVENTS } from '../__mocks__/event-data'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const meta = {
  title: 'Components/TaskDetail',
  component: TaskDetail,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <div className="max-w-2xl">
            <Story />
          </div>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof TaskDetail>
export default meta

type Story = StoryObj<typeof meta>

export const Executing: Story = {
  args: {
    task: MOCK_TASKS.executing,
    events: MOCK_EVENTS,
    connected: true,
  },
}

export const Paused: Story = {
  args: {
    task: MOCK_TASKS.paused,
    events: MOCK_EVENTS.slice(0, 5),
    connected: false,
  },
}

export const Completed: Story = {
  args: {
    task: {
      ...MOCK_TASKS.completed,
      branch_name: 'task/6-bug-fix',
      description: 'ステータスバッジの色が間違ってたのを修正',
    },
    events: MOCK_EVENTS,
    connected: false,
  },
}

export const Stopped: Story = {
  args: {
    task: MOCK_TASKS.stopped,
    events: [],
    connected: false,
  },
}
