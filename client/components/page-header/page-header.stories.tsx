// PageHeader のストーリー

import type { Meta, StoryObj } from '@storybook/react'
import { PageHeader } from './page-header'

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
} satisfies Meta<typeof PageHeader>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'タスク一覧',
    subtitle: '実行中のタスクを管理する',
  },
}

export const WithAction: Story = {
  args: {
    title: 'ダッシュボード',
    subtitle: '進捗の確認',
  },
  render: (args) => (
    <PageHeader {...args}>
      <button className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
        新規作成
      </button>
    </PageHeader>
  ),
}

export const TitleOnly: Story = {
  args: { title: 'シンプルヘッダー' },
}
