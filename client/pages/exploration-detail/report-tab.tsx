// 探索詳細ページ — レポートタブ
// 5ブロック固定表示 + 証跡画像 + AIでタスク化ボタン
// Pencilデザイン準拠

import type { ExplorationArtifact, ExplorationSession } from '@cognac/shared'
import type { LucideIcon } from 'lucide-react'
import {
  CircleArrowRight,
  ImageIcon,
  Lightbulb,
  MessageSquare,
  Search,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { TaskifyModal } from '@/components/taskify-modal'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useExplorationReport, useTaskifyExploration } from '@/hooks/use-explorations'

// --- レポートmarkdownパーサー ---

const REPORT_HEADINGS = [
  '結論',
  '調査内容',
  'ディスカッション要約',
  '課題',
  '次アクション',
] as const

interface ParsedReport {
  conclusion: string
  investigation: string
  discussionSummary: string
  issues: string
  nextActions: string
}

function parseReportMarkdown(markdown: string): ParsedReport {
  const result: ParsedReport = {
    conclusion: '',
    investigation: '',
    discussionSummary: '',
    issues: '',
    nextActions: '',
  }

  const keys: (keyof ParsedReport)[] = [
    'conclusion',
    'investigation',
    'discussionSummary',
    'issues',
    'nextActions',
  ]

  for (let i = 0; i < REPORT_HEADINGS.length; i++) {
    const heading = REPORT_HEADINGS[i]
    const pattern = new RegExp(`^##\\s+${heading}\\s*$`, 'm')
    const match = markdown.match(pattern)
    if (!match || match.index === undefined) continue

    const start = match.index + match[0].length
    // 次の ## heading までの範囲を取得
    const rest = markdown.slice(start)
    const nextHeading = rest.match(/^##\s+/m)
    const content =
      nextHeading && nextHeading.index !== undefined ? rest.slice(0, nextHeading.index) : rest

    result[keys[i]] = content.trim()
  }

  return result
}

// --- レポートブロックコンポーネント ---

function ReportBlock({
  icon: Icon,
  iconColor,
  title,
  content,
  size = 'md',
}: {
  icon: LucideIcon
  iconColor: string
  title: string
  content: string
  size?: 'md' | 'sm'
}) {
  const padding = size === 'sm' ? 'p-4' : 'p-5'
  const titleSize = size === 'sm' ? 'text-[13px]' : 'text-sm'

  return (
    <Card className={`${padding} flex flex-col gap-3`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className={`${titleSize} font-semibold text-foreground`}>{title}</span>
      </div>
      <div className="h-px bg-border" />
      <p className="whitespace-pre-wrap text-[13px] leading-normal text-foreground">{content}</p>
    </Card>
  )
}

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

// --- レポートブロック群 ---

function ReportBlocks({ report, size = 'md' }: { report: ParsedReport; size?: 'md' | 'sm' }) {
  return (
    <>
      <ReportBlock
        icon={Lightbulb}
        iconColor="text-blue-600"
        title="結論"
        content={report.conclusion}
        size={size}
      />
      <ReportBlock
        icon={Search}
        iconColor="text-blue-600"
        title="調査内容"
        content={report.investigation}
        size={size}
      />
      <ReportBlock
        icon={MessageSquare}
        iconColor="text-blue-600"
        title="ディスカッション要約"
        content={report.discussionSummary}
        size={size}
      />
      <ReportBlock
        icon={TriangleAlert}
        iconColor="text-amber-500"
        title="課題"
        content={report.issues}
        size={size}
      />
      <ReportBlock
        icon={CircleArrowRight}
        iconColor="text-green-600"
        title="次アクション"
        content={report.nextActions}
        size={size}
      />
    </>
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

  const parsed = useMemo(
    () => (reportData?.markdown ? parseReportMarkdown(reportData.markdown) : null),
    [reportData?.markdown],
  )

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

      {parsed ? (
        <ReportBlocks report={parsed} />
      ) : (
        <Card className="p-5">
          <p className="whitespace-pre-wrap text-[13px] leading-normal text-foreground">
            {reportData?.markdown ?? exploration.final_report_markdown}
          </p>
        </Card>
      )}

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

  const parsed = useMemo(
    () => (reportData?.markdown ? parseReportMarkdown(reportData.markdown) : null),
    [reportData?.markdown],
  )

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

      {parsed ? (
        <ReportBlocks report={parsed} size="sm" />
      ) : (
        <Card className="p-4">
          <p className="whitespace-pre-wrap text-[13px] leading-normal text-foreground">
            {reportData?.markdown ?? exploration.final_report_markdown}
          </p>
        </Card>
      )}

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
