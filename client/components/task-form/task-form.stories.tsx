// TaskForm のストーリー

import type { Meta, StoryObj } from '@storybook/react'
import { TaskForm } from './task-form'

const meta = {
  title: 'Components/TaskForm',
  component: TaskForm,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskForm>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
