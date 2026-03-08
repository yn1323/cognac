// ExplorationModal のストーリー
// PC版(オーバーレイモーダル) と SP版(フルスクリーン) の確認用

import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { ExplorationModal } from './exploration-modal'

const meta: Meta<typeof ExplorationModal> = {
  title: 'Components/ExplorationModal',
  component: ExplorationModal,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/explorations?new-exploration=true']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof meta>

export const PC: Story = {
  parameters: {
    viewport: { defaultViewport: 'responsive' },
  },
}

export const SP: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
}
