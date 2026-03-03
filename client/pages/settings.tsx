// 設定ページ
// PC: サイドバー + メインコンテンツ / SP: ヘッダー + ボディ + ボトムナビ
// デザイン design.pen PC=SGKRj, SP=Oroa8 に準拠

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks, PlusCircle, Settings } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { SPBottomNav, SPNavItem } from '@/components/sp-bottom-nav'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

// --- ヘルパーコンポーネント ---

function SettingsInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium leading-[1.4] text-foreground">
        {label}
      </label>
      <Input
        className="mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  titleClassName,
  descClassName,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  titleClassName?: string
  descClassName?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className={titleClassName ?? 'text-sm font-medium leading-[1.4] text-foreground'}>
          {title}
        </span>
        <span className={descClassName ?? 'text-xs text-muted-foreground'}>
          {description}
        </span>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={checked ? 'bg-blue-600' : undefined}
      />
    </div>
  )
}

// --- ナビゲーションマップ ---

const NAV_MAP: Record<string, string> = {
  Tasks: '/',
  Settings: '/settings',
}

// --- 共有State型 ---

interface SettingsState {
  projectRoot: string
  defaultBranch: string
  cliPath: string
  maxRetries: string
  autoExecute: boolean
  autoCi: boolean
  autoMerge: boolean
}

interface SettingsActions {
  setProjectRoot: (v: string) => void
  setDefaultBranch: (v: string) => void
  setCliPath: (v: string) => void
  setMaxRetries: (v: string) => void
  setAutoExecute: (v: boolean) => void
  setAutoCi: (v: boolean) => void
  setAutoMerge: (v: boolean) => void
}

// --- PC版 ---

function PCSettings({
  state,
  actions,
}: {
  state: SettingsState
  actions: SettingsActions
}) {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeItem="Settings"
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
            Settings
          </h1>
          <p className="text-sm leading-[1.4] text-muted-foreground">
            Cognac の動作設定を管理します
          </p>
        </div>

        {/* General セクション */}
        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-base">General</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              プロジェクト基本設定
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 p-6 pt-0">
            <SettingsInput
              label="Project Root"
              value={state.projectRoot}
              onChange={actions.setProjectRoot}
            />
            <SettingsInput
              label="Default Branch"
              value={state.defaultBranch}
              onChange={actions.setDefaultBranch}
            />
            <div className="flex gap-4">
              <SettingsInput
                label="Claude CLI Path"
                value={state.cliPath}
                onChange={actions.setCliPath}
                className="flex-1"
              />
              <SettingsInput
                label="Max Retries"
                value={state.maxRetries}
                onChange={actions.setMaxRetries}
                className="w-40"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI & Execution セクション */}
        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-base">AI & Execution</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              AI実行とCI設定
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 p-6 pt-0">
            <ToggleRow
              title="Auto Execute"
              description="プラン確定後に自動でコード実行を開始"
              checked={state.autoExecute}
              onCheckedChange={actions.setAutoExecute}
            />
            <ToggleRow
              title="Auto CI"
              description="コード実行後に自動でCI(typecheck→lint→test→build)を実行"
              checked={state.autoCi}
              onCheckedChange={actions.setAutoCi}
            />
            <ToggleRow
              title="Auto Merge"
              description="CI成功後に自動でデフォルトブランチにマージ"
              checked={state.autoMerge}
              onCheckedChange={actions.setAutoMerge}
            />
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button className="bg-blue-600 hover:bg-blue-700">Save Settings</Button>
        </div>
      </main>
    </div>
  )
}

// --- SP版 ---

function SPSettings({
  state,
  actions,
}: {
  state: SettingsState
  actions: SettingsActions
}) {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-background px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
      </header>

      <main className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {/* General セクション */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-[15px]">General</CardTitle>
            <p className="text-xs text-muted-foreground">
              プロジェクト基本設定
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-0">
            <SettingsInput
              label="Project Root"
              value={state.projectRoot}
              onChange={actions.setProjectRoot}
            />
            <SettingsInput
              label="Default Branch"
              value={state.defaultBranch}
              onChange={actions.setDefaultBranch}
            />
            <SettingsInput
              label="Claude CLI Path"
              value={state.cliPath}
              onChange={actions.setCliPath}
            />
            <SettingsInput
              label="Max Retries"
              value={state.maxRetries}
              onChange={actions.setMaxRetries}
            />
          </CardContent>
        </Card>

        {/* AI & Execution セクション */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-[15px]">AI & Execution</CardTitle>
            <p className="text-xs text-muted-foreground">AI実行とCI設定</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-0">
            <ToggleRow
              title="Auto Execute"
              description="プラン完了後に自動でコード実行"
              checked={state.autoExecute}
              onCheckedChange={actions.setAutoExecute}
              titleClassName="text-[13px] font-medium text-foreground"
              descClassName="text-[11px] text-muted-foreground"
            />
            <ToggleRow
              title="Auto CI"
              description="CI自動実行（テスト・ビルド検証）"
              checked={state.autoCi}
              onCheckedChange={actions.setAutoCi}
              titleClassName="text-[13px] font-medium text-foreground"
              descClassName="text-[11px] text-muted-foreground"
            />
            <ToggleRow
              title="Auto Merge"
              description="CI成功後にmainへ自動マージ・プッシュ"
              checked={state.autoMerge}
              onCheckedChange={actions.setAutoMerge}
              titleClassName="text-[13px] font-medium text-foreground"
              descClassName="text-[11px] text-muted-foreground"
            />
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button className="bg-blue-600 hover:bg-blue-700">Save Settings</Button>
        </div>
      </main>

      {/* ボトムナビ */}
      <SPBottomNav>
        <SPNavItem
          icon={ListChecks}
          label="Tasks"
          onClick={() => navigate('/')}
        />
        <button
          type="button"
          className="flex flex-col items-center gap-1"
          onClick={() => navigate('/?new-task=true')}
        >
          <PlusCircle className="h-7 w-7 text-primary" />
        </button>
        <SPNavItem icon={Settings} label="Settings" active />
      </SPBottomNav>
    </div>
  )
}

// --- エクスポート ---

export function SettingsPage() {
  const [projectRoot, setProjectRoot] = useState('/Users/natani/work/cognac')
  const [defaultBranch, setDefaultBranch] = useState('main')
  const [cliPath, setCliPath] = useState('claude')
  const [maxRetries, setMaxRetries] = useState('5')
  const [autoExecute, setAutoExecute] = useState(true)
  const [autoCi, setAutoCi] = useState(true)
  const [autoMerge, setAutoMerge] = useState(false)

  const state: SettingsState = {
    projectRoot,
    defaultBranch,
    cliPath,
    maxRetries,
    autoExecute,
    autoCi,
    autoMerge,
  }

  const actions: SettingsActions = {
    setProjectRoot,
    setDefaultBranch,
    setCliPath,
    setMaxRetries,
    setAutoExecute,
    setAutoCi,
    setAutoMerge,
  }

  return (
    <>
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCSettings state={state} actions={actions} />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPSettings state={state} actions={actions} />
      </div>
    </>
  )
}
