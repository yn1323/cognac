// ディスカッション共通マーカーコンポーネント
// ラウンドセパレーターと合意形成マーカー

import { CheckCircle2 } from 'lucide-react'

// ラウンドセパレーター
export function RoundSeparator({ round }: { round: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">ラウンド {round}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// 合意形成マーカー
export function ConsensusMarker({ size = 'md' }: { size?: 'md' | 'sm' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-[#16a34a]/30" />
      <div className="flex items-center gap-1.5">
        <CheckCircle2
          className={size === 'sm' ? 'h-3.5 w-3.5 text-[#16a34a]' : 'h-4 w-4 text-[#16a34a]'}
        />
        <span className={`font-medium text-[#16a34a] ${size === 'sm' ? 'text-xs' : 'text-[13px]'}`}>
          合意形成完了
        </span>
      </div>
      <div className="h-px flex-1 bg-[#16a34a]/30" />
    </div>
  )
}
