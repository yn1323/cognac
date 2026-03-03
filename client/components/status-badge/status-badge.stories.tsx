// StatusBadge のストーリー
// 全ステータスのバリエーションを表示

import type { Meta, StoryObj } from '@storybook/react'
import { StatusBadge } from './status-badge'
import { ALL_STATUSES } from '../__mocks__/task-data'

const meta = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ALL_STATUSES,
    },
  },
} satisfies Meta<typeof StatusBadge>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { status: 'executing' },
}

// 全ステータス一覧
export const AllStatuses: Story = {
  args: { status: 'pending' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {ALL_STATUSES.map((s) => (
        <StatusBadge key={s} status={s} />
      ))}
    </div>
  ),
}
