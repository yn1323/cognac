// タスク詳細ページ — プランタブ
// デザイン design.pen PC=pdM6h, SP=8w1Xs に準拠

import { FileText, Terminal, Copy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// --- モックデータ ---

const MOCK_PLAN_STEPS = [
  {
    number: 1,
    title: 'Setup auth middleware + JWT utilities',
    desc: 'server/src/middleware/auth.ts と server/src/utils/jwt.ts を作成。トークン生成・検証・リフレッシュのユーティリティ関数を実装。',
    files: ['server/src/middleware/auth.ts', 'server/src/utils/jwt.ts'],
  },
  {
    number: 2,
    title: 'Create auth API endpoints',
    desc: 'POST /api/auth/login, POST /api/auth/logout, POST /api/auth/refresh のエンドポイントを実装。',
  },
  {
    number: 3,
    title: 'Implement Zustand auth store',
    desc: 'client/src/stores/authStore.ts を作成。ログイン状態、ユーザー情報、トークン管理のストアを実装。',
  },
  {
    number: 4,
    title: 'Build ProtectedRoute component',
    desc: '認証済みユーザーのみアクセス可能なルートガードコンポーネントを作成。未認証時はログインページへリダイレクト。',
  },
  {
    number: 5,
    title: 'Write tests for auth flow',
    desc: 'JWT ユーティリティ、APIエンドポイント、ProtectedRouteのユニットテスト・結合テストを作成。',
  },
]

const MOCK_PROMPT_LINES = [
  { text: '以下の実装計画に従ってコードを書いてください。', color: '#d4d4d4' },
  { text: '', color: '#d4d4d4' },
  { text: '## Step 1: JWT Middleware', color: '#569cd6' },
  { text: '- server/src/middleware/auth.ts を作成', color: '#d4d4d4' },
  { text: '- jsonwebtoken を使ってトークン検証', color: '#d4d4d4' },
  { text: '- SameSite=Strict の Cookie 設定', color: '#d4d4d4' },
  { text: '...', color: '#6a737d' },
]

// --- PC版 ---

export function PCPlanTab() {
  return (
    <div className="flex flex-col gap-6">
      {/* ステータスバナー */}
      <div className="flex items-center gap-3 rounded-lg border border-[#2563eb30] bg-[#eff6ff] px-4 py-3">
        <FileText className="h-[18px] w-[18px] shrink-0 text-[#2563eb]" />
        <span className="text-[13px] font-medium leading-[1.4] text-[#1e40af]">
          Plan generated from discussion consensus. Ready for execution.
        </span>
      </div>

      {/* Implementation Plan カード */}
      <Card className="overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">
              Implementation Plan
            </h2>
            <Badge>5 steps</Badge>
          </div>
        </div>

        {/* ステップリスト */}
        <div className="flex flex-col px-6">
          {MOCK_PLAN_STEPS.map((step, i) => (
            <div
              key={step.number}
              className={`flex flex-col gap-1 py-4 ${i < MOCK_PLAN_STEPS.length - 1 ? 'border-b' : ''}`}
            >
              {/* ステップヘッダー */}
              <div className="flex items-center gap-2">
                <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary">
                  <span className="text-[11px] font-semibold text-primary-foreground">
                    {step.number}
                  </span>
                </div>
                <span className="text-sm font-semibold leading-[1.4] text-foreground">
                  {step.title}
                </span>
              </div>

              {/* 説明 */}
              <p className="text-[13px] leading-[1.5] text-muted-foreground">
                {step.desc}
              </p>

              {/* ファイルパス */}
              {step.files && (
                <div className="flex flex-col gap-1.5 pl-[30px] pt-1">
                  {step.files.map((f) => (
                    <span
                      key={f}
                      className="text-xs leading-[1.4] text-[#2563eb]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Execution Prompt カード */}
      <Card className="overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              Execution Prompt
            </h2>
          </div>
          <Button variant="outline" size="sm">
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy
          </Button>
        </div>

        {/* コードブロック */}
        <div className="p-6">
          <div className="flex flex-col rounded-lg bg-[#1e1e1e] p-4">
            {MOCK_PROMPT_LINES.map((line, i) => (
              <span
                key={i}
                className="font-mono text-xs leading-[1.6]"
                style={{ color: line.color }}
              >
                {line.text || '\u00A0'}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

// --- SP版 ---

export function SPPlanTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* ステータスバナー */}
      <div className="flex items-center gap-2.5 rounded-lg border border-[#2563eb30] bg-[#eff6ff] px-3 py-2.5">
        <FileText className="h-4 w-4 shrink-0 text-[#2563eb]" />
        <span className="text-xs font-medium leading-[1.4] text-[#1e40af]">
          Plan ready for execution
        </span>
      </div>

      {/* プランカード */}
      <Card className="overflow-hidden">
        {MOCK_PLAN_STEPS.map((step, i) => (
          <div
            key={step.number}
            className={`flex flex-col gap-1 px-3.5 py-3 ${i < MOCK_PLAN_STEPS.length - 1 ? 'border-b' : ''}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                <span className="text-[10px] font-semibold text-primary-foreground">
                  {step.number}
                </span>
              </div>
              <span className="text-[13px] font-semibold leading-[1.4] text-foreground">
                {step.title}
              </span>
            </div>
            <p className="pl-7 text-xs leading-[1.4] text-muted-foreground">
              {step.desc}
            </p>
          </div>
        ))}
      </Card>
    </div>
  )
}
