import type { Meta, StoryObj } from '@storybook/react'
import { withMockFetch } from '../../.storybook/decorators'
import { Sidebar } from './sidebar'

const MOCK_SETTINGS = {
  provider: 'claude',
  ci: { maxRetries: 5, steps: [] },
  git: { commitLogLimit: 50, commitMessageLanguage: 'ja' },
}

const meta = {
  title: 'Components/Sidebar',
  component: Sidebar,
  parameters: {
    viewport: { defaultViewport: 'responsive' },
    layout: 'fullscreen',
  },
  decorators: [
    withMockFetch({ '/api/settings': MOCK_SETTINGS }),
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
  args: { activeItem: 'タスク' },
}

export const SettingsActive: Story = {
  args: { activeItem: '設定' },
}
