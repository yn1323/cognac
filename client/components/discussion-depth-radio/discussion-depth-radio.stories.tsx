import type { DiscussionDepth } from '@cognac/shared'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { DiscussionDepthRadio } from './discussion-depth-radio'

const meta = {
  title: 'Components/DiscussionDepthRadio',
  component: DiscussionDepthRadio,
  tags: ['autodocs'],
} satisfies Meta<typeof DiscussionDepthRadio>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { value: 3, onChange: () => {} },
  render: () => {
    const [value, setValue] = useState<DiscussionDepth>(3)
    return <DiscussionDepthRadio value={value} onChange={setValue} />
  },
}

export const Medium: Story = {
  args: { value: 5, onChange: () => {} },
  render: () => {
    const [value, setValue] = useState<DiscussionDepth>(5)
    return <DiscussionDepthRadio value={value} onChange={setValue} />
  },
}

export const Deep: Story = {
  args: { value: 7, onChange: () => {} },
  render: () => {
    const [value, setValue] = useState<DiscussionDepth>(7)
    return <DiscussionDepthRadio value={value} onChange={setValue} />
  },
}

export const Disabled: Story = {
  args: { value: 3, onChange: () => {}, disabled: true },
}
