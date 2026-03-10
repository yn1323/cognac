// 設定ページ
// PC: サイドバー + メインコンテンツ / SP: ヘッダー + ボディ + ボトムナビ
// デザイン design.pen PC=SGKRj, SP=Oroa8 に準拠

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react'
import type { CiStep, CliProvider, CommitMessageLanguage } from '@cognac/shared'
import { Sidebar } from '@/components/sidebar'
import { NAV_MAP } from '@/lib/constants'
import { AppBottomNav } from '@/components/app-bottom-nav'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDeleteDatabase, useSettings, useUpdateSettings } from '@/hooks/use-system'
import { useToast } from '@/components/toast'

// --- CIコマンドエディター ---

function CiCommandsEditor({
  steps,
  onChange,
}: {
  steps: CiStep[]
  onChange: (steps: CiStep[]) => void
}) {
  const addStep = () => onChange([...steps, { name: '', command: '' }])

  const removeStep = (i: number) => onChange(steps.filter((_, idx) => idx !== i))

  const updateStep = (i: number, field: 'name' | 'command', value: string) => {
    const updated = [...steps]
    updated[i] = { ...updated[i], [field]: value }
    onChange(updated)
  }

  const moveUp = (i: number) => {
    if (i === 0) return
    const updated = [...steps]
    ;[updated[i - 1], updated[i]] = [updated[i], updated[i - 1]]
    onChange(updated)
  }

  const moveDown = (i: number) => {
    if (i === steps.length - 1) return
    const updated = [...steps]
    ;[updated[i], updated[i + 1]] = [updated[i + 1], updated[i]]
    onChange(updated)
  }

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              type="button"
              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() => moveUp(i)}
              disabled={i === 0}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() => moveDown(i)}
              disabled={i === steps.length - 1}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <Input
            placeholder="ステップ名"
            value={step.name}
            onChange={(e) => updateStep(i, 'name', e.target.value)}
            className="w-28 shrink-0 md:w-36"
          />
          <Input
            placeholder="コマンド (例: pnpm typecheck)"
            value={step.command}
            onChange={(e) => updateStep(i, 'command', e.target.value)}
            className="flex-1"
          />
          <button
            type="button"
            className="p-1 text-muted-foreground hover:text-destructive"
            onClick={() => removeStep(i)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addStep} type="button" className="self-start">
        <Plus className="mr-1 h-4 w-4" />
        コマンドを追加
      </Button>
      {steps.length === 0 && (
        <p className="text-[13px] text-muted-foreground">
          コマンドが未設定の場合、package.json から自動検出します
        </p>
      )}
    </div>
  )
}

// --- 共通パネルProps ---

interface SettingsPanelProps {
  provider: CliProvider
  setProvider: (v: CliProvider) => void
  maxRetries: string
  setMaxRetries: (v: string) => void
  commitLogLimit: string
  setCommitLogLimit: (v: string) => void
  commitMessageLanguage: CommitMessageLanguage
  setCommitMessageLanguage: (v: CommitMessageLanguage) => void
  ciSteps: CiStep[]
  setCiSteps: (steps: CiStep[]) => void
  onDeleteDatabase: () => void
  onSave: () => void
  isSaving: boolean
}

// --- PC版 ---

function PCSettings({
  provider,
  setProvider,
  maxRetries,
  setMaxRetries,
  commitLogLimit,
  setCommitLogLimit,
  commitMessageLanguage,
  setCommitMessageLanguage,
  ciSteps,
  setCiSteps,
  onDeleteDatabase,
  onSave,
  isSaving,
}: SettingsPanelProps) {
  const navigate = useNavigate()

  return (
    <div className="flex h-dvh bg-background">
      <Sidebar
        activeItem="設定"
        onItemClick={(label) => {
          const path = NAV_MAP[label]
          if (path) navigate(path)
        }}
        className="h-full shrink-0"
      />

      <main className="flex flex-1 flex-col gap-8 overflow-y-auto p-8">
        {/* ヘッダー */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold leading-[1.3] text-foreground">
            設定
          </h1>
          <p className="text-sm leading-[1.4] text-muted-foreground">
            Cognac の動作設定を管理します
          </p>
        </div>

        {/* 基本設定セクション */}
        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-base">基本設定</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              プロジェクト基本設定
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 p-6 pt-0">
            <div>
              <label className="text-sm font-medium leading-[1.4] text-foreground">
                CLIプロバイダー
              </label>
              <select
                className="mt-1.5 flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={provider}
                onChange={(e) => setProvider(e.target.value as CliProvider)}
              >
                <option value="claude">Claude Code</option>
                <option value="codex">Codex CLI</option>
              </select>
              <p className="mt-1 text-[12px] text-muted-foreground">
                タスク実行に使用するAI CLIツール
              </p>
            </div>
            <div>
              <label className="text-sm font-medium leading-[1.4] text-foreground">
                最大リトライ回数
              </label>
              <Input
                className="mt-1.5 w-32"
                type="number"
                min={0}
                max={20}
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
              />
              <p className="mt-1 text-[12px] text-muted-foreground">
                CI失敗時にコード修正を再試行する最大回数
              </p>
            </div>
            <div>
              <label className="text-sm font-medium leading-[1.4] text-foreground">
                コミット履歴表示件数
              </label>
              <Input
                className="mt-1.5 w-32"
                type="number"
                min={1}
                max={100}
                value={commitLogLimit}
                onChange={(e) => setCommitLogLimit(e.target.value)}
              />
              <p className="mt-1 text-[12px] text-muted-foreground">
                Gitページに表示するコミット履歴の件数
              </p>
            </div>
            <div>
              <label className="text-sm font-medium leading-[1.4] text-foreground">
                コミットメッセージ言語
              </label>
              <select
                className="mt-1.5 flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={commitMessageLanguage}
                onChange={(e) => setCommitMessageLanguage(e.target.value as CommitMessageLanguage)}
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
              <p className="mt-1 text-[12px] text-muted-foreground">
                AIが自動生成するコミットメッセージの言語
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CI設定セクション */}
        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-base">CI設定</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              タスク完了時に実行するCIコマンドを設定します
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 p-6 pt-0">
            <CiCommandsEditor steps={ciSteps} onChange={setCiSteps} />
          </CardContent>
        </Card>

        {/* Danger Zone セクション */}
        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-base text-destructive">
              Danger Zone
            </CardTitle>
            <p className="text-[13px] text-muted-foreground">
              取り消しできない操作
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 p-6 pt-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium leading-[1.4] text-foreground">
                  データベースを削除
                </span>
                <span className="text-[13px] leading-[1.4] text-muted-foreground">
                  SQLiteデータベースファイルを完全に削除します。すべてのタスク・ログが失われます。
                </span>
              </div>
              <Button
                variant="destructive"
                className="shrink-0"
                onClick={onDeleteDatabase}
              >
                データベース削除
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button variant="primary" onClick={onSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '設定を保存'}
          </Button>
        </div>
      </main>
    </div>
  )
}

// --- SP版 ---

function SPSettings({
  provider,
  setProvider,
  maxRetries,
  setMaxRetries,
  commitLogLimit,
  setCommitLogLimit,
  commitMessageLanguage,
  setCommitMessageLanguage,
  ciSteps,
  setCiSteps,
  onDeleteDatabase,
  onSave,
  isSaving,
}: SettingsPanelProps) {
  const navigate = useNavigate()

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-background px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">設定</h1>
      </header>

      <main className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 pb-20">
        {/* 基本設定セクション */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-[15px]">基本設定</CardTitle>
            <p className="text-xs text-muted-foreground">
              プロジェクト基本設定
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-0">
            <div>
              <label className="text-sm font-medium leading-[1.4] text-foreground">
                CLIプロバイダー
              </label>
              <select
                className="mt-1.5 flex h-9 w-44 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={provider}
                onChange={(e) => setProvider(e.target.value as CliProvider)}
              >
                <option value="claude">Claude Code</option>
                <option value="codex">Codex CLI</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                タスク実行に使用するAI CLIツール
              </p>
            </div>
            <div>
              <label className="text-sm font-medium leading-[1.4] text-foreground">
                最大リトライ回数
              </label>
              <Input
                className="mt-1.5 w-28"
                type="number"
                min={0}
                max={20}
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                CI失敗時にコード修正を再試行する最大回数
              </p>
            </div>
            <div>
              <label className="text-sm font-medium leading-[1.4] text-foreground">
                コミット履歴表示件数
              </label>
              <Input
                className="mt-1.5 w-28"
                type="number"
                min={1}
                max={100}
                value={commitLogLimit}
                onChange={(e) => setCommitLogLimit(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Gitページに表示するコミット履歴の件数
              </p>
            </div>
            <div>
              <label className="text-sm font-medium leading-[1.4] text-foreground">
                コミットメッセージ言語
              </label>
              <select
                className="mt-1.5 flex h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={commitMessageLanguage}
                onChange={(e) => setCommitMessageLanguage(e.target.value as CommitMessageLanguage)}
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                AIが自動生成するコミットメッセージの言語
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CI設定セクション */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-[15px]">CI設定</CardTitle>
            <p className="text-xs text-muted-foreground">
              タスク完了時に実行するCIコマンド
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-0">
            <CiCommandsEditor steps={ciSteps} onChange={setCiSteps} />
          </CardContent>
        </Card>

        {/* Danger Zone セクション */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-[15px] text-destructive">
              Danger Zone
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              取り消しできない操作
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-foreground">
                  データベースを削除
                </span>
                <span className="text-[11px] text-muted-foreground">
                  SQLiteデータベースファイルを完全に削除します。すべてのタスク・ログが失われます。
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={onDeleteDatabase}
              >
                データベース削除
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button variant="primary" onClick={onSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '設定を保存'}
          </Button>
        </div>
      </main>

      {/* ボトムナビ */}
      <AppBottomNav activeItem="設定" />
    </div>
  )
}

// --- エクスポート ---

export function SettingsPage() {
  const [provider, setProvider] = useState<CliProvider>('claude')
  const [maxRetries, setMaxRetries] = useState('5')
  const [commitLogLimit, setCommitLogLimit] = useState('50')
  const [commitMessageLanguage, setCommitMessageLanguage] = useState<CommitMessageLanguage>('ja')
  const [ciSteps, setCiSteps] = useState<CiStep[]>([])
  const [showDbDeleteConfirm, setShowDbDeleteConfirm] = useState(false)
  const deleteDatabase = useDeleteDatabase()
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const { toast } = useToast()

  // サーバーから初期値をロード（初回のみ）
  const initialized = useRef(false)
  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true
      setProvider(settings.provider)
      setMaxRetries(String(settings.ci.maxRetries))
      setCommitLogLimit(String(settings.git.commitLogLimit))
      setCommitMessageLanguage(settings.git.commitMessageLanguage)
      setCiSteps(settings.ci.steps)
    }
  }, [settings])

  const handleSave = () => {
    const maxRetriesNum = parseInt(maxRetries, 10)
    if (Number.isNaN(maxRetriesNum) || maxRetriesNum < 0) {
      toast('入力値を確認してください', 'warning')
      return
    }
    const commitLogLimitNum = parseInt(commitLogLimit, 10)
    if (Number.isNaN(commitLogLimitNum) || commitLogLimitNum < 1) {
      toast('入力値を確認してください', 'warning')
      return
    }

    updateSettings.mutate(
      {
        provider,
        ci: {
          maxRetries: maxRetriesNum,
          steps: ciSteps.filter((s) => s.name.trim() && s.command.trim()),
        },
        git: {
          commitLogLimit: commitLogLimitNum,
          commitMessageLanguage,
        },
      },
      {
        onSuccess: () => toast('設定を保存しました', 'success'),
        onError: () => toast('保存に失敗しました', 'error'),
      },
    )
  }

  const handleDeleteDatabase = () => {
    deleteDatabase.mutate(undefined, {
      onSuccess: () => setShowDbDeleteConfirm(false),
      onError: () => setShowDbDeleteConfirm(false),
    })
  }

  const panelProps: SettingsPanelProps = {
    provider,
    setProvider,
    maxRetries,
    setMaxRetries,
    commitLogLimit,
    setCommitLogLimit,
    commitMessageLanguage,
    setCommitMessageLanguage,
    ciSteps,
    setCiSteps,
    onDeleteDatabase: () => setShowDbDeleteConfirm(true),
    onSave: handleSave,
    isSaving: updateSettings.isPending,
  }

  return (
    <>
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCSettings {...panelProps} />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPSettings {...panelProps} />
      </div>

      <ConfirmDialog
        open={showDbDeleteConfirm}
        onConfirm={handleDeleteDatabase}
        onCancel={() => setShowDbDeleteConfirm(false)}
        title="データベースを再初期化する？"
        description="この操作は取り消せません。既存データを削除して、最新スキーマでデータベースを作り直します。"
        confirmLabel="再初期化する"
        variant="destructive"
        isLoading={deleteDatabase.isPending}
      />
    </>
  )
}
