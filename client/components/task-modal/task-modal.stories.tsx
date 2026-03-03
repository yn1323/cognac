// TaskModal のストーリー
// PC版(オーバーレイモーダル) と SP版(フルスクリーン) のパターン

import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { TaskModal } from './task-modal'

const meta: Meta<typeof TaskModal> = {
  title: 'Components/TaskModal',
  component: TaskModal,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/?new-task=true']}>
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
