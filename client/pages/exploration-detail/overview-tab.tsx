// 探索詳細ページ — 概要タブ
// タスクのoverview-tab.tsxと同じパターン
// ペルソナはディスカッションタブに配置（コード正）

import { useState } from 'react'
import type { ExplorationSession, ExplorationImage } from '@cognac/shared'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { EXPLORATION_STATUS_CONFIG } from '@/lib/exploration-status-config'

// --- モック画像データ ---

const MOCK_IMAGES: ExplorationImage[] = [
  {
    id: 1,
    exploration_session_id: 2,
    source_type: 'user',
    file_path: 'uploads/exploration/1/screenshot1.png',
    original_name: 'screenshot1.png',
    mime_type: 'image/png',
    created_at: '2026-03-07T14:00:00Z',
  },
]

// --- 画像セクション ---

function ExplorationImagesSection({
  images,
  size = 'md',
}: {
  images: ExplorationImage[]
  size?: 'md' | 'sm'
}) {
  const [enlarged, setEnlarged] = useState<ExplorationImage | null>(null)

  if (images.length === 0) return null

  const thumbSize = size === 'sm' ? 'h-16 w-16' : 'h-20 w-20'

  return (
    <>
      <Card className={size === 'sm' ? 'p-4' : 'p-6'}>
        <h2
          className={cn(
            'font-semibold text-foreground',
            size === 'sm' ? 'mb-3 text-[15px]' : 'mb-4 text-base',
          )}
        >
          添付画像
        </h2>
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setEnlarged(img)}
              className="group relative"
            >
              <img
                src={`/${img.file_path}`}
                alt={img.original_name ?? '画像'}
                className={cn(
                  thumbSize,
                  'rounded-lg border border-border object-cover transition-all hover:ring-2 hover:ring-blue-500',
                )}
              />
            </button>
          ))}
        </div>
      </Card>

      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-8"
          onClick={() => setEnlarged(null)}
        >
          <img
            src={`/${enlarged.file_path}`}
            alt={enlarged.original_name ?? '画像'}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  )
}

// --- PC版 ---

export function PCOverviewTab({ exploration }: { exploration: ExplorationSession }) {
  const config = EXPLORATION_STATUS_CONFIG[exploration.status]

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          探索情報
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-30 shrink-0 text-[13px] font-medium text-muted-foreground">
              ステータス
            </span>
            <Badge variant={config.badgeVariant}>{config.label}</Badge>
          </div>
          {exploration.started_at && (
            <div className="flex items-center gap-2">
              <span className="w-30 shrink-0 text-[13px] font-medium text-muted-foreground">
                開始日時
              </span>
              <span className="text-[13px] text-foreground">
                {formatDateTime(exploration.started_at)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-30 shrink-0 text-[13px] font-medium text-muted-foreground">
              作成日時
            </span>
            <span className="text-[13px] text-foreground">
              {formatDateTime(exploration.created_at)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-muted-foreground">
              説明
            </span>
            <p className="whitespace-pre-wrap text-[13px] leading-[1.6] text-foreground">
              {exploration.request || '説明なし'}
            </p>
          </div>
        </div>
      </Card>

      {/* TODO: サーバー接続時にAPI経由で画像を取得 */}
      <ExplorationImagesSection images={MOCK_IMAGES} />
    </div>
  )
}

// --- SP版 ---

export function SPOverviewTab({ exploration }: { exploration: ExplorationSession }) {
  const config = EXPLORATION_STATUS_CONFIG[exploration.status]

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <h3 className="mb-3 text-[15px] font-semibold text-foreground">
          探索情報
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
              ステータス
            </span>
            <Badge variant={config.badgeVariant}>{config.label}</Badge>
          </div>
          {exploration.started_at && (
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                開始日時
              </span>
              <span className="text-xs text-foreground">
                {formatDateTime(exploration.started_at)}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              説明
            </span>
            <p className="whitespace-pre-wrap text-xs leading-[1.5] text-foreground">
              {exploration.request || '説明なし'}
            </p>
          </div>
        </div>
      </Card>

      <ExplorationImagesSection images={MOCK_IMAGES} size="sm" />
    </div>
  )
}
