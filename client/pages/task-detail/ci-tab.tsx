// タスク詳細ページ — CIタブ
// デザイン design.pen PC=MIuKS, SP=09sQT に準拠

import { ExternalLink, Loader } from 'lucide-react'

// --- PC版 ---

export function PCCITab() {
  return (
    <div className="flex flex-col gap-6">
      {/* ステータスバナー */}
      <div className="flex items-center gap-3 rounded-lg border border-[#2563eb30] bg-[#eff6ff] px-4 py-3">
        <Loader className="h-[18px] w-[18px] shrink-0 text-[#2563eb]" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold leading-[1.4] text-[#1e40af]">
            CI実行 #3 — 進行中
          </span>
          <span className="text-xs leading-[1.4] text-[#3b82f6]">
            試行 2/5 · 開始 14:32:22
          </span>
        </div>
      </div>

      {/* CI カード */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        {/* Row 1 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Loader className="h-5 w-5 text-[#2563eb]" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold leading-[1.4] text-foreground">
                CI 実行中
              </span>
              <span className="text-xs leading-[1.4] text-muted-foreground">
                pnpm typecheck && lint && test && build
              </span>
            </div>
          </div>
          <span className="text-xs leading-[1.4] text-muted-foreground">
            2:34 経過
          </span>
        </div>

        {/* Note */}
        <span className="text-xs leading-[1.4] text-muted-foreground">
          試行 2/5 · 開始 14:32:22
        </span>
      </div>

      {/* Logs リンク */}
      <div className="flex items-center gap-1.5">
        <ExternalLink className="h-3.5 w-3.5 text-primary" />
        <span className="text-[13px] leading-[1.4] text-muted-foreground">
          実行ログの詳細はログタブで確認できます
        </span>
      </div>
    </div>
  )
}

// --- SP版 ---

export function SPCITab() {
  return (
    <div className="flex flex-col gap-3">
      {/* ステータスバナー */}
      <div className="flex items-center justify-between rounded-lg border border-[#2563eb30] bg-[#dbeafe] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Loader className="h-4 w-4 shrink-0 text-[#2563eb]" />
          <span className="text-xs font-semibold leading-[1.4] text-[#1e40af]">
            CI実行 #3 - 実行中
          </span>
        </div>
        <span className="text-xs font-medium text-[#1e40af]">2:34</span>
      </div>

      {/* CI カード */}
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold leading-[1.4] text-foreground">
              CI 実行中
            </span>
            <span className="text-xs leading-[1.4] text-muted-foreground">
              typecheck, lint, test, build
            </span>
          </div>
          <span className="text-xs text-muted-foreground">2:34</span>
        </div>
        <span className="text-[11px] leading-[1.4] text-muted-foreground">
          試行 2/5 · 開始 14:32
        </span>
      </div>

      {/* Logs リンク */}
      <div className="flex items-center gap-1.5">
        <ExternalLink className="h-3 w-3 text-primary" />
        <span className="text-xs leading-[1.4] text-muted-foreground">
          詳細はログタブで確認
        </span>
      </div>
    </div>
  )
}
