// 探索詳細ページ — レポートタブ
// 5ブロック固定表示 + 証跡画像 + AIでタスク化ボタン
// Pencilデザイン準拠

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Lightbulb,
  Search,
  MessageSquare,
  TriangleAlert,
  CircleArrowRight,
  ImageIcon,
  Sparkles,
} from 'lucide-react'
import type { ExplorationSession } from '@cognac/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast'

// --- モックレポートデータ ---

const MOCK_REPORT = {
  conclusion: 'ダッシュボードの初期読み込み性能は良好ですが、DataTableのLCPが1.6秒と基準超過。仮想化リストとメモ化の導入で改善が見込まれます。',
  investigation: '• PlaywrightでTTI/LCP/FIDを計測\n• DataTableが最大ボトルネック（430ms）\n• 不要な再レンダリングが3回発生\n• APIレスポンスは平均180msで良好',
  discussionSummary: '3名のペルソナがDataTableの最適化から着手することで合意。仮想化リストとメモ化を推奨。',
  issues: '• 仮想化のUXトレードオフ\n• メモ化過度のメモリリスク\n• E2Eテスト影響が未評価',
  nextActions: '1. 仮想化リスト導入\n2. useEffect依存配列修正\n3. 回帰テスト追加\n4. 再計測で効果検証',
}

const MOCK_EVIDENCE_IMAGES = [
  { id: 1, name: 'dashboard-initial-load.png' },
  { id: 2, name: 'datatable-render-profile.png' },
  { id: 3, name: 'lighthouse-score.png' },
]

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
  const textSize = size === 'sm' ? 'text-[13px]' : 'text-[13px]'

  return (
    <Card className={`${padding} flex flex-col gap-3`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className={`${titleSize} font-semibold text-foreground`}>{title}</span>
      </div>
      <div className="h-px bg-border" />
      <p className={`whitespace-pre-wrap ${textSize} leading-[1.5] text-foreground`}>
        {content}
      </p>
    </Card>
  )
}

// --- 証跡画像セクション ---

function EvidenceSection({ size = 'md' }: { size?: 'md' | 'sm' }) {
  const thumbW = size === 'sm' ? 'w-[100px]' : 'w-[120px]'
  const thumbH = size === 'sm' ? 'h-[70px]' : 'h-[80px]'

  return (
    <Card className={size === 'sm' ? 'p-4' : 'p-5'}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-blue-600" />
          <span className={`${size === 'sm' ? 'text-[13px]' : 'text-sm'} font-semibold text-foreground`}>
            証跡画像
          </span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex gap-2 overflow-x-auto">
          {MOCK_EVIDENCE_IMAGES.map((img) => (
            <div
              key={img.id}
              className={`${thumbW} ${thumbH} flex shrink-0 flex-col items-center justify-center gap-1 rounded-md bg-muted`}
            >
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="max-w-full truncate px-1 text-[10px] text-muted-foreground">
                {img.name}
              </span>
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
  const [isTaskifying, setIsTaskifying] = useState(false)

  const hasReport = exploration.status === 'completed' && exploration.final_report_markdown

  const handleTaskify = () => {
    // TODO: サーバー接続時にAPI呼び出しに差し替え
    setIsTaskifying(true)
    console.log('AIでタスク化:', exploration.id)
    setTimeout(() => {
      toast('タスク化を開始しました', 'success')
      setIsTaskifying(false)
    }, 1000)
  }

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
          onClick={handleTaskify}
          disabled={isTaskifying}
        >
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          AIでタスク化
        </Button>
      </div>

      <ReportBlock icon={Lightbulb} iconColor="text-blue-600" title="結論" content={MOCK_REPORT.conclusion} />
      <ReportBlock icon={Search} iconColor="text-blue-600" title="調査内容" content={MOCK_REPORT.investigation} />
      <ReportBlock icon={MessageSquare} iconColor="text-blue-600" title="ディスカッション要約" content={MOCK_REPORT.discussionSummary} />
      <ReportBlock icon={TriangleAlert} iconColor="text-amber-500" title="課題" content={MOCK_REPORT.issues} />
      <ReportBlock icon={CircleArrowRight} iconColor="text-green-600" title="次アクション" content={MOCK_REPORT.nextActions} />

      <EvidenceSection />
    </div>
  )
}

// --- SP版 ---

export function SPReportTab({ exploration }: { exploration: ExplorationSession }) {
  const { toast } = useToast()
  const [isTaskifying, setIsTaskifying] = useState(false)

  const hasReport = exploration.status === 'completed' && exploration.final_report_markdown

  const handleTaskify = () => {
    setIsTaskifying(true)
    console.log('AIでタスク化:', exploration.id)
    setTimeout(() => {
      toast('タスク化を開始しました', 'success')
      setIsTaskifying(false)
    }, 1000)
  }

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
          onClick={handleTaskify}
          disabled={isTaskifying}
        >
          <Sparkles className="mr-1 h-3 w-3" />
          AIでタスク化
        </Button>
      </div>

      <ReportBlock icon={Lightbulb} iconColor="text-blue-600" title="結論" content={MOCK_REPORT.conclusion} size="sm" />
      <ReportBlock icon={Search} iconColor="text-blue-600" title="調査内容" content={MOCK_REPORT.investigation} size="sm" />
      <ReportBlock icon={MessageSquare} iconColor="text-blue-600" title="ディスカッション要約" content={MOCK_REPORT.discussionSummary} size="sm" />
      <ReportBlock icon={TriangleAlert} iconColor="text-amber-500" title="課題" content={MOCK_REPORT.issues} size="sm" />
      <ReportBlock icon={CircleArrowRight} iconColor="text-green-600" title="次アクション" content={MOCK_REPORT.nextActions} size="sm" />

      <EvidenceSection size="sm" />
    </div>
  )
}
