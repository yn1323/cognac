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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDeleteDatabase } from '@/hooks/use-system'

interface SettingsPanelProps {
  maxRetries: string
  setMaxRetries: (v: string) => void
  onDeleteDatabase: () => void
}

// --- PC版 ---

function PCSettings({
  maxRetries,
  setMaxRetries,
  onDeleteDatabase,
}: SettingsPanelProps) {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeItem="設定"
        onItemClick={(label) => {
          if (label === 'タスク') navigate('/')
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

        {/* General セクション */}
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
                最大リトライ回数
              </label>
              <Input
                className="mt-1.5"
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 危険ゾーン セクション */}
        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-base text-destructive">
              危険ゾーン
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
          <Button className="bg-blue-600 hover:bg-blue-700">設定を保存</Button>
        </div>
      </main>
    </div>
  )
}

// --- SP版 ---

function SPSettings({
  maxRetries,
  setMaxRetries,
  onDeleteDatabase,
}: SettingsPanelProps) {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-background px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">設定</h1>
      </header>

      <main className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {/* General セクション */}
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
                最大リトライ回数
              </label>
              <Input
                className="mt-1.5"
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 危険ゾーン セクション */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-[15px] text-destructive">
              危険ゾーン
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
          <Button className="bg-blue-600 hover:bg-blue-700">設定を保存</Button>
        </div>
      </main>

      {/* ボトムナビ */}
      <SPBottomNav>
        <SPNavItem
          icon={ListChecks}
          label="タスク"
          onClick={() => navigate('/')}
        />
        <button
          type="button"
          className="flex flex-col items-center gap-1"
          onClick={() => navigate('/?new-task=true')}
        >
          <PlusCircle className="h-7 w-7 text-primary" />
        </button>
        <SPNavItem icon={Settings} label="設定" active />
      </SPBottomNav>
    </div>
  )
}

// --- エクスポート ---

export function SettingsPage() {
  const [maxRetries, setMaxRetries] = useState('5')
  const [showDbDeleteConfirm, setShowDbDeleteConfirm] = useState(false)
  const deleteDatabase = useDeleteDatabase()

  const handleDeleteDatabase = () => {
    deleteDatabase.mutate(undefined, {
      onSuccess: () => setShowDbDeleteConfirm(false),
      onError: () => setShowDbDeleteConfirm(false),
    })
  }

  return (
    <>
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCSettings
          maxRetries={maxRetries}
          setMaxRetries={setMaxRetries}
          onDeleteDatabase={() => setShowDbDeleteConfirm(true)}
        />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPSettings
          maxRetries={maxRetries}
          setMaxRetries={setMaxRetries}
          onDeleteDatabase={() => setShowDbDeleteConfirm(true)}
        />
      </div>

      <ConfirmDialog
        open={showDbDeleteConfirm}
        onConfirm={handleDeleteDatabase}
        onCancel={() => setShowDbDeleteConfirm(false)}
        title="データベースを削除する？"
        description="この操作は取り消せません。すべてのタスク・ログ・実行履歴が完全に削除されます。"
        confirmLabel="削除する"
        variant="destructive"
        isLoading={deleteDatabase.isPending}
      />
    </>
  )
}
