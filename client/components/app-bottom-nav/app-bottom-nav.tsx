// SP共通ボトムナビゲーション
// 全ページで同じ3アイテム（タスク・Git・設定）を表示する

import { useNavigate } from 'react-router-dom'
import { ListChecks, GitBranch, Settings } from 'lucide-react'
import { SPBottomNav, SPNavItem } from '@/components/sp-bottom-nav'
import { NAV_MAP } from '@/lib/constants'

type NavLabel = 'タスク' | 'Git' | '設定'

const NAV_ITEMS: { icon: typeof ListChecks; label: NavLabel }[] = [
  { icon: ListChecks, label: 'タスク' },
  { icon: GitBranch, label: 'Git' },
  { icon: Settings, label: '設定' },
]

interface AppBottomNavProps {
  activeItem: NavLabel
}

export function AppBottomNav({ activeItem }: AppBottomNavProps) {
  const navigate = useNavigate()

  return (
    <SPBottomNav>
      {NAV_ITEMS.map((item) => (
        <SPNavItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          active={item.label === activeItem}
          onClick={
            item.label === activeItem
              ? undefined
              : () => navigate(NAV_MAP[item.label])
          }
        />
      ))}
    </SPBottomNav>
  )
}
