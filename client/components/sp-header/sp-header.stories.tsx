// SPHeader のストーリー

import type { Meta, StoryObj } from '@storybook/react'
import { SPHeader } from './sp-header'

const meta: Meta<typeof SPHeader> = {
  title: 'Components/SP/SPHeader',
  component: SPHeader,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
