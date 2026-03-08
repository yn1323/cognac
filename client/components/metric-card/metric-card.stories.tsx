// MetricCard のストーリー

import type { Meta, StoryObj } from '@storybook/react'
import { MetricCard } from './metric-card'
import { ListTodo, CheckCircle, Clock, AlertTriangle, Play, AlertCircle } from 'lucide-react'

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

export const ActivePending: Story = {
  args: {
    label: 'Pending',
    value: 5,
    icon: Clock,
    active: true,
    activeBg: 'bg-[#f9fafb]',
    activeBorder: 'border-[#6b7280]',
    activeLabelColor: 'text-[#6b7280]',
    activeValueColor: 'text-[#374151]',
    activeIconColor: 'text-[#6b7280]',
  },
}

export const ActiveExecuting: Story = {
  args: {
    label: 'Executing',
    value: 1,
    icon: Play,
    active: true,
    activeBg: 'bg-[#eff6ff]',
    activeBorder: 'border-[#2563eb]',
    activeLabelColor: 'text-[#2563eb]',
    activeValueColor: 'text-[#2563eb]',
    activeIconColor: 'text-[#2563eb]',
  },
}

export const InactiveCompleted: Story = {
  args: {
    label: 'Completed',
    value: 12,
    icon: CheckCircle,
    active: false,
  },
}

// ダッシュボード風の複数カード並び（フィルター状態あり）
export const DashboardRow: Story = {
  args: { label: '全タスク', value: 24, icon: ListTodo },
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        label="Pending"
        value={5}
        icon={Clock}
        active
        activeBg="bg-[#f9fafb]"
        activeBorder="border-[#6b7280]"
        activeLabelColor="text-[#6b7280]"
        activeValueColor="text-[#374151]"
        activeIconColor="text-[#6b7280]"
      />
      <MetricCard
        label="Executing"
        value={1}
        icon={Play}
        active
        activeBg="bg-[#eff6ff]"
        activeBorder="border-[#2563eb]"
        activeLabelColor="text-[#2563eb]"
        activeValueColor="text-[#2563eb]"
        activeIconColor="text-[#2563eb]"
      />
      <MetricCard label="Completed" value={12} icon={CheckCircle} />
      <MetricCard
        label="Failed"
        value={2}
        icon={AlertCircle}
        active
        activeBg="bg-[#fef2f2]"
        activeBorder="border-[#dc2626]"
        activeLabelColor="text-[#dc2626]"
        activeValueColor="text-[#dc2626]"
        activeIconColor="text-[#dc2626]"
      />
    </div>
  ),
}
