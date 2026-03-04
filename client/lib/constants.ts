// クライアント共通定数

import type { PriorityLabel } from '@cognac/shared'

// shared パッケージからランタイムimportするとNode.js依存が引っ張られるのでローカル定義
export const PRIORITY_MAP: Record<PriorityLabel, number> = { Low: 0, Normal: 1, High: 2, Urgent: 3 }
export const PRIORITY_REVERSE: Record<number, PriorityLabel> = { 0: 'Low', 1: 'Normal', 2: 'High', 3: 'Urgent' }

export const PC_PRIORITIES: PriorityLabel[] = ['Low', 'Normal', 'High', 'Urgent']
export const SP_PRIORITIES: PriorityLabel[] = ['Low', 'Normal', 'High']
