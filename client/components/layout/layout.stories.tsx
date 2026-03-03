// Layout のストーリー
// Outlet + Link を使うので MemoryRouter が必要

import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from './layout'

const meta = {
  title: 'Components/Layout',
  component: Layout,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Layout>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
