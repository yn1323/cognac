// TaskForm のストーリー
// useCreateTask() を使うので QueryClientProvider が必要

import type { Meta, StoryObj } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TaskForm } from './task-form'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const meta = {
  title: 'Components/TaskForm',
  component: TaskForm,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="max-w-md">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof TaskForm>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
