// タスク詳細ページ — プランタブ
// デザイン design.pen PC=pdM6h, SP=8w1Xs に準拠

import { useState } from 'react'
import { FileText, Terminal, Copy, Check } from 'lucide-react'
import type { Task } from '@cognac/shared'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTaskPlan } from '@/hooks/use-tasks'

// 複雑度バッジの色
const COMPLEXITY_STYLES: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-[#dcfce7]', text: 'text-[#16a34a]' },
  medium: { bg: 'bg-[#fef9c3]', text: 'text-[#ca8a04]' },
  high: { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]' },
}

// コピーボタン
function CopyButton({ text, size = 'md' }: { text: string; size?: 'md' | 'sm' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-1.5`} />
          コピー済み
        </>
      ) : (
        <>
          <Copy className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-1.5`} />
          コピー
        </>
      )}
    </Button>
  )
}

// --- PC版 ---

export function PCPlanTab({ task }: { task: Task }) {
  const { data: plan } = useTaskPlan(task.id)

  if (!plan) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        プラン生成を待っています
      </p>
    )
  }

  const complexityStyle = plan.estimated_complexity
    ? COMPLEXITY_STYLES[plan.estimated_complexity]
    : null

  return (
    <div className="flex flex-col gap-6">
      {/* ステータスバナー */}
      <div className="flex items-center gap-3 rounded-lg border border-[#2563eb30] bg-[#eff6ff] px-4 py-3">
        <FileText className="h-[18px] w-[18px] shrink-0 text-[#2563eb]" />
        <span className="text-[13px] font-medium leading-[1.4] text-[#1e40af]">
          ディスカッションの合意からプランを生成しました。実行準備完了。
        </span>
        {complexityStyle && (
          <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${complexityStyle.bg} ${complexityStyle.text}`}>
            複雑度: {plan.estimated_complexity}
          </span>
        )}
      </div>

      {/* Implementation Plan カード */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">
              実装プラン
            </h2>
            {plan.total_rounds > 0 && (
              <Badge>{plan.total_rounds} ラウンドの議論を経て作成</Badge>
            )}
          </div>
        </div>

        <div className="p-6">
          <pre className="whitespace-pre-wrap text-sm leading-[1.6] text-foreground">
            {plan.plan_markdown}
          </pre>
        </div>
      </Card>

      {/* Execution Prompt カード */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              実行プロンプト
            </h2>
          </div>
          <CopyButton text={plan.execution_prompt} />
        </div>

        <div className="p-6">
          <div className="overflow-x-auto rounded-lg bg-[#1e1e1e] p-4">
            <pre className="font-mono text-xs leading-[1.6] text-[#d4d4d4]">
              {plan.execution_prompt}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  )
}

// --- SP版 ---

export function SPPlanTab({ task }: { task: Task }) {
  const { data: plan } = useTaskPlan(task.id)

  if (!plan) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        プラン生成を待っています
      </p>
    )
  }

  const complexityStyle = plan.estimated_complexity
    ? COMPLEXITY_STYLES[plan.estimated_complexity]
    : null

  return (
    <div className="flex flex-col gap-4">
      {/* ステータスバナー */}
      <div className="flex items-center gap-2.5 rounded-lg border border-[#2563eb30] bg-[#eff6ff] px-3 py-2.5">
        <FileText className="h-4 w-4 shrink-0 text-[#2563eb]" />
        <span className="text-xs font-medium leading-[1.4] text-[#1e40af]">
          プラン実行準備完了
        </span>
        {complexityStyle && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${complexityStyle.bg} ${complexityStyle.text}`}>
            {plan.estimated_complexity}
          </span>
        )}
      </div>

      {/* プランカード */}
      <Card className="overflow-hidden p-3.5">
        <pre className="whitespace-pre-wrap text-[13px] leading-[1.5] text-foreground">
          {plan.plan_markdown}
        </pre>
      </Card>

      {/* 実行プロンプト */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-3.5 pt-3.5">
          <div className="flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-foreground" />
            <span className="text-[13px] font-semibold text-foreground">
              実行プロンプト
            </span>
          </div>
          <CopyButton text={plan.execution_prompt} size="sm" />
        </div>
        <div className="p-3.5">
          <div className="overflow-x-auto rounded-lg bg-[#1e1e1e] p-3">
            <pre className="font-mono text-[11px] leading-[1.5] text-[#d4d4d4]">
              {plan.execution_prompt}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  )
}
