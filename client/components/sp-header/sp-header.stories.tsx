// SPHeader のストーリー

import type { Meta, StoryObj } from '@storybook/react'
import { SPHeader } from './sp-header'
import { fn } from '@storybook/test'

const meta: Meta<typeof SPHeader> = {
  title: 'Components/SP/SPHeader',
  component: SPHeader,
  tags: ['autodocs'],
  args: {
    onMenuClick: fn(),
    onNotificationClick: fn(),
  },
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
