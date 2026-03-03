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

export const AllStatuses: Story = {
  args: { value: 5, label: 'Pending' },
  render: () => (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      <SPMetric value={5} label="Pending" />
      <SPMetric
        value={1}
        label="Exec"
        textColor="text-[#2563eb]"
        bgColor="bg-[#eff6ff]"
        borderColor="border-[#2563eb30]"
      />
      <SPMetric
        value={12}
        label="Done"
        textColor="text-[#16a34a]"
        bgColor="bg-[#f0fdf4]"
        borderColor="border-[#16a34a30]"
      />
      <SPMetric
        value={2}
        label="Stop"
        textColor="text-[#dc2626]"
        bgColor="bg-[#fef2f2]"
        borderColor="border-[#dc262630]"
      />
    </div>
  ),
}
