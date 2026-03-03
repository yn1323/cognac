// SPDetailHeader のストーリー

import type { Meta, StoryObj } from '@storybook/react'
import { SPDetailHeader } from './sp-detail-header'
import { SPTab } from '../sp-tabs'
import { fn } from '@storybook/test'

const meta: Meta<typeof SPDetailHeader> = {
  title: 'Components/SP/SPDetailHeader',
  component: SPDetailHeader,
  tags: ['autodocs'],
  args: {
    onBack: fn(),
  },
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: '認証機能の実装',
    subtitle: 'Task #4 - 実行中',
  },
}

export const WithTabs: Story = {
  args: {
    title: '認証機能の実装',
    subtitle: 'Task #4',
  },
  render: ({ title = '', subtitle, onBack }) => (
    <SPDetailHeader title={title} subtitle={subtitle} onBack={onBack}>
      <SPTab label="概要" active />
      <SPTab label="ログ" />
      <SPTab label="ファイル" />
    </SPDetailHeader>
  ),
}

export const LongTitle: Story = {
  args: {
    title: 'とても長いタスクタイトルが入った場合のトランケーション確認用テスト',
    subtitle: 'Task #99',
  },
}
