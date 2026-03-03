import type { Meta, StoryObj } from '@storybook/react'
import { Sidebar } from './sidebar'

const meta = {
  title: 'Components/Sidebar',
  component: Sidebar,
  parameters: {
    viewport: { defaultViewport: 'responsive' },
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const DashboardActive: Story = {
  args: { activeItem: 'Dashboard' },
}
