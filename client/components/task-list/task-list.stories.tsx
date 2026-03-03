// TaskList のストーリー
// useTasks() を内部で使うので QueryClientProvider + fetch モックが必要

import type { Meta, StoryObj } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TaskList } from './task-list'
import { MOCK_TASKS } from '../__mocks__/task-data'

const meta = {
  title: 'Components/TaskList',
  component: TaskList,
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      // fetchをモックして /api/tasks にモックデータを返す
      const originalFetch = globalThis.fetch
      globalThis.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        if (url.includes('/api/tasks')) {
          return new Response(JSON.stringify(Object.values(MOCK_TASKS)), {
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return originalFetch(input, init)
      }

      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      })

      return (
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <div className="max-w-md">
              <Story />
            </div>
          </MemoryRouter>
        </QueryClientProvider>
      )
    },
  ],
} satisfies Meta<typeof TaskList>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
