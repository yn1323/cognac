// TaskList のストーリー
// useTasks() を内部で使うので QueryClientProvider + fetch モックが必要

import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { withQueryClient } from '../../.storybook/decorators'
import { TaskList } from './task-list'
import { MOCK_TASKS } from '../__mocks__/task-data'

const meta = {
  title: 'Components/TaskList',
  component: TaskList,
  tags: ['autodocs'],
  decorators: [
    withQueryClient({ '/api/tasks': Object.values(MOCK_TASKS) }),
    (Story) => (
      <MemoryRouter>
        <div className="max-w-md">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof TaskList>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
