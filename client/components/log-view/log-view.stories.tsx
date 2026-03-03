// LogView のストーリー
// 空・少量・大量イベントのパターン

import type { Meta, StoryObj } from '@storybook/react'
import { LogView } from './log-view'
import { MOCK_EVENTS } from '../__mocks__/event-data'

const meta = {
  title: 'Components/LogView',
  component: LogView,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LogView>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: { events: [] },
}

export const WithEvents: Story = {
  args: { events: MOCK_EVENTS },
}

export const FewEvents: Story = {
  args: { events: MOCK_EVENTS.slice(0, 3) },
}
