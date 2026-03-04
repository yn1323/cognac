// クライアント共通定数

import { PRIORITY_MAP } from '@cognac/shared'
import type { PriorityLabel } from '@cognac/shared'

export { PRIORITY_MAP }
export const PRIORITY_REVERSE: Record<number, PriorityLabel> = { 0: 'Low', 1: 'Normal', 2: 'High', 3: 'Urgent' }

export const PC_PRIORITIES: PriorityLabel[] = ['Low', 'Normal', 'High', 'Urgent']
export const SP_PRIORITIES: PriorityLabel[] = ['Low', 'Normal', 'High']

// サイドバーナビゲーションのラベル→パスマッピング
export const NAV_MAP: Record<string, string> = {
  タスク: '/',
  設定: '/settings',
}
