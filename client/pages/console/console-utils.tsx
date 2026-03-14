// コンソールページ用ユーティリティ
// ステータス表示・時刻フォーマットなどの共通ロジック

import type { ConsoleCommandListItem } from '@cognac/shared'

// ステータス表示ユーティリティ
export type DerivedStatus = ConsoleCommandListItem['derived_status']

export const STATUS_CONFIG: Record<
  DerivedStatus,
  { dotClass: string; badgeClass: string; borderColorClass: string }
> = {
  running: {
    dotClass: 'bg-[#2563eb]',
    badgeClass: 'bg-[#dbeafe] text-[#2563eb]',
    borderColorClass: 'border-[#2563eb]',
  },
  starting: {
    dotClass: 'bg-[#2563eb]',
    badgeClass: 'bg-[#dbeafe] text-[#2563eb]',
    borderColorClass: 'border-[#2563eb]',
  },
  stopping: {
    dotClass: 'bg-[#f59e0b]',
    badgeClass: 'bg-[#fef3c7] text-[#f59e0b]',
    borderColorClass: 'border-[#e5e5e5]',
  },
  completed: {
    dotClass: 'bg-[#22c55e]',
    badgeClass: 'bg-[#dcfce7] text-[#16a34a]',
    borderColorClass: 'border-[#e5e5e5]',
  },
  failed: {
    dotClass: 'bg-[#e7000b]',
    badgeClass: 'bg-[#fde8e8] text-[#e7000b]',
    borderColorClass: 'border-[#e5e5e5]',
  },
  killed: {
    dotClass: 'bg-[#737373]',
    badgeClass: 'bg-[#f5f5f5] text-[#737373]',
    borderColorClass: 'border-[#e5e5e5]',
  },
  idle: {
    dotClass: 'bg-[#a3a3a3]',
    badgeClass: 'bg-[#f5f5f5] text-[#737373]',
    borderColorClass: 'border-[#e5e5e5]',
  },
}

export function StatusBadge({ status }: { status: DerivedStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.badgeClass}`}
    >
      {status}
    </span>
  )
}

export function StatusDot({ status }: { status: DerivedStatus }) {
  const cfg = STATUS_CONFIG[status]
  return <span className={`inline-block h-2 w-2 rounded-full ${cfg.dotClass}`} />
}

export function formatTime(isoString: string): string {
  // SQLiteの datetime('now') は UTC だが 'Z' なしで返るため、ローカル扱いされないよう補正
  const normalized =
    isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`
  const d = new Date(normalized)
  return d.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
