// SPHeader のストーリー

import type { Meta, StoryObj } from '@storybook/react'
import { withMockFetch } from '../../.storybook/decorators'
import { SPHeader } from './sp-header'

const MOCK_SETTINGS = {
  provider: 'claude',
  ci: { maxRetries: 5, steps: [] },
  git: { commitLogLimit: 50, commitMessageLanguage: 'ja' },
}

const meta: Meta<typeof SPHeader> = {
  title: 'Components/SP/SPHeader',
  component: SPHeader,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [withMockFetch({ '/api/settings': MOCK_SETTINGS })],
}
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
