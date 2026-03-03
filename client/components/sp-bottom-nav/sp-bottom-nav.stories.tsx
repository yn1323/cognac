// SPBottomNav のストーリー

import type { Meta, StoryObj } from '@storybook/react'
import { SPBottomNav, SPNavItem } from './sp-bottom-nav'
import { Home, ListTodo, Settings } from 'lucide-react'
import { fn } from '@storybook/test'

const meta = {
  title: 'Components/SP/SPBottomNav',
  component: SPBottomNav,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SPBottomNav>
export default meta

type Story = StoryObj<typeof meta>

export const HomeActive: Story = {
  args: { children: null },
  render: () => (
    <SPBottomNav>
      <SPNavItem icon={Home} label="ホーム" active onClick={fn()} />
      <SPNavItem icon={ListTodo} label="タスク" onClick={fn()} />
      <SPNavItem icon={Settings} label="設定" onClick={fn()} />
    </SPBottomNav>
  ),
}

export const TaskActive: Story = {
  args: { children: null },
  render: () => (
    <SPBottomNav>
      <SPNavItem icon={Home} label="ホーム" onClick={fn()} />
      <SPNavItem icon={ListTodo} label="タスク" active onClick={fn()} />
      <SPNavItem icon={Settings} label="設定" onClick={fn()} />
    </SPBottomNav>
  ),
}
