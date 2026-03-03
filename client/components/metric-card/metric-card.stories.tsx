// MetricCard のストーリー

import type { Meta, StoryObj } from '@storybook/react'
import { MetricCard } from './metric-card'
import { ListTodo, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

const meta = {
  title: 'Components/MetricCard',
  component: MetricCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MetricCard>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: '全タスク',
    value: 24,
    icon: ListTodo,
  },
}

export const Completed: Story = {
  args: {
    label: '完了',
    value: 18,
    icon: CheckCircle,
  },
}

// ダッシュボード風の複数カード並び
export const DashboardRow: Story = {
  args: { label: '全タスク', value: 24, icon: ListTodo },
  render: () => (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard label="全タスク" value={24} icon={ListTodo} />
      <MetricCard label="完了" value={18} icon={CheckCircle} />
      <MetricCard label="実行中" value={3} icon={Clock} />
      <MetricCard label="停止" value={2} icon={AlertTriangle} />
    </div>
  ),
}
