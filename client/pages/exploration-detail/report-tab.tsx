// 探索詳細ページ — レポートタブ
// MarkdownRenderer一発表示 + 証跡画像 + AIでタスク化ボタン

import type { ExplorationArtifact, ExplorationSession } from '@cognac/shared'
import { ImageIcon, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { TaskifyModal } from '@/components/taskify-modal'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useExplorationReport, useTaskifyExploration } from '@/hooks/use-explorations'

// --- 証跡画像セクション ---

function EvidenceSection({
  images,
  size = 'md',
}: {
  images: ExplorationArtifact[]
  size?: 'md' | 'sm'
}) {
  if (images.length === 0) return null

  const thumbW = size === 'sm' ? 'w-[100px]' : 'w-[120px]'
  const thumbH = size === 'sm' ? 'h-[70px]' : 'h-[80px]'

  return (
    <Card className={size === 'sm' ? 'p-4' : 'p-5'}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-blue-600" />
          <span
            className={`${size === 'sm' ? 'text-[13px]' : 'text-sm'} font-semibold text-foreground`}
          >
            証跡画像
          </span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img) => (
            <div key={img.id}>
              {img.file_path ? (
                <img
                  src={`/${img.file_path}`}
                  alt={img.title ?? '証跡画像'}
                  className={`${thumbW} ${thumbH} shrink-0 rounded-md border border-border object-cover`}
                />
              ) : (
                <div
                  className={`${thumbW} ${thumbH} flex shrink-0 flex-col items-center justify-center gap-1 rounded-md bg-muted`}
                >
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="max-w-full truncate px-1 text-[10px] text-muted-foreground">
                    {img.title ?? '画像'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// --- PC版 ---

export function PCReportTab({ exploration }: { exploration: ExplorationSession }) {
  const { toast } = useToast()
  const { data: reportData } = useExplorationReport(
    exploration.id,
    exploration.status === 'completed',
  )
  const taskifyMutation = useTaskifyExploration()
  const [taskifyModalOpen, setTaskifyModalOpen] = useState(false)

  const hasReport = exploration.status === 'completed' && exploration.final_report_markdown

  if (!hasReport) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        レポートはまだ生成されていません
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* アクション行 */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setTaskifyModalOpen(true)}
          disabled={taskifyMutation.isPending}
        >
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          AIでタスク化
        </Button>
      </div>

      {/* レポート本体 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto p-5">
          <MarkdownRenderer
            content={reportData?.markdown ?? exploration.final_report_markdown ?? ''}
            variant="full"
          />
        </div>
      </Card>

      <EvidenceSection images={reportData?.evidenceImages ?? []} />

      <TaskifyModal
        open={taskifyModalOpen}
        onClose={() => setTaskifyModalOpen(false)}
        onSubmit={(userInstruction) => {
          taskifyMutation.mutate(
            { id: exploration.id, userInstruction: userInstruction || undefined },
            {
              onSuccess: () => {
                setTaskifyModalOpen(false)
                toast('タスク化を開始しました', 'success')
              },
              onError: (err) => toast(err.message, 'error'),
            },
          )
        }}
        isPending={taskifyMutation.isPending}
      />
    </div>
  )
}

// --- SP版 ---

export function SPReportTab({ exploration }: { exploration: ExplorationSession }) {
  const { toast } = useToast()
  const { data: reportData } = useExplorationReport(
    exploration.id,
    exploration.status === 'completed',
  )
  const taskifyMutation = useTaskifyExploration()
  const [taskifyModalOpen, setTaskifyModalOpen] = useState(false)

  const hasReport = exploration.status === 'completed' && exploration.final_report_markdown

  if (!hasReport) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        レポートはまだ生成されていません
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setTaskifyModalOpen(true)}
          disabled={taskifyMutation.isPending}
        >
          <Sparkles className="mr-1 h-3 w-3" />
          AIでタスク化
        </Button>
      </div>

      {/* レポート本体 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto p-4">
          <MarkdownRenderer
            content={reportData?.markdown ?? exploration.final_report_markdown ?? ''}
            variant="full"
            className="text-[13px]"
          />
        </div>
      </Card>

      <EvidenceSection images={reportData?.evidenceImages ?? []} size="sm" />

      <TaskifyModal
        open={taskifyModalOpen}
        onClose={() => setTaskifyModalOpen(false)}
        onSubmit={(userInstruction) => {
          taskifyMutation.mutate(
            { id: exploration.id, userInstruction: userInstruction || undefined },
            {
              onSuccess: () => {
                setTaskifyModalOpen(false)
                toast('タスク化を開始しました', 'success')
              },
              onError: (err) => toast(err.message, 'error'),
            },
          )
        }}
        isPending={taskifyMutation.isPending}
      />
    </div>
  )
}
