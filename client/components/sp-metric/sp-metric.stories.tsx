import type { Meta, StoryObj } from '@storybook/react'
import { SPMetric } from './sp-metric'

const meta = {
  title: 'Components/SPMetric',
  component: SPMetric,
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', gap: 8, maxWidth: 390, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SPMetric>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { value: 5, label: 'Pending' },
}

export const ActivePending: Story = {
  args: {
    value: 5,
    label: 'Pending',
    active: true,
    activeTextColor: 'text-[#374151]',
    activeBgColor: 'bg-[#f9fafb]',
    activeBorderColor: 'border-[#6b7280]',
  },
}

export const Inactive: Story = {
  args: {
    value: 12,
    label: 'Done',
    active: false,
  },
}

// ダッシュボード風（フィルター状態あり）
export const AllStatuses: Story = {
  args: { value: 5, label: 'Pending' },
  render: () => (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      <SPMetric
        value={5}
        label="Pending"
        active
        activeTextColor="text-[#374151]"
        activeBgColor="bg-[#f9fafb]"
        activeBorderColor="border-[#6b7280]"
      />
      <SPMetric
        value={1}
        label="Exec"
        active
        activeTextColor="text-[#2563eb]"
        activeBgColor="bg-[#eff6ff]"
        activeBorderColor="border-[#2563eb]"
      />
      <SPMetric value={12} label="Done" />
      <SPMetric
        value={2}
        label="Stop"
        active
        activeTextColor="text-[#dc2626]"
        activeBgColor="bg-[#fef2f2]"
        activeBorderColor="border-[#dc2626]"
      />
    </div>
  ),
}
