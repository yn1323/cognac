// SPTabs のストーリー

import type { Meta, StoryObj } from '@storybook/react'
import { SPTab, SPTabBar } from './sp-tabs'
import { fn } from '@storybook/test'

const meta = {
  title: 'Components/SP/SPTabs',
  component: SPTabBar,
  tags: ['autodocs'],
} satisfies Meta<typeof SPTabBar>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: null },
  render: () => (
    <SPTabBar>
      <SPTab label="概要" active onClick={fn()} />
      <SPTab label="ログ" onClick={fn()} />
      <SPTab label="ファイル" onClick={fn()} />
    </SPTabBar>
  ),
}

export const SecondActive: Story = {
  args: { children: null },
  render: () => (
    <SPTabBar>
      <SPTab label="概要" onClick={fn()} />
      <SPTab label="ログ" active onClick={fn()} />
      <SPTab label="ファイル" onClick={fn()} />
    </SPTabBar>
  ),
}
