// コンソール画面
// PC: サイドバー + コマンドパネル(380px) + ログパネル / SP: リスト ↔ ログ詳細
// デザイン ConsolePage.pen PC=HmvhY, SP-List=wukk3, SP-Log=3tUlE に準拠

import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Play,
  Square,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowLeft,
} from 'lucide-react'
import type { ConsoleCommandListItem } from '@cognac/shared'
import { Sidebar } from '@/components/sidebar'
import { AppBottomNav } from '@/components/app-bottom-nav'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { NAV_MAP } from '@/lib/constants'
import { CommandModal } from './command-modal'
import { MOCK_COMMANDS, MOCK_LOG_CONTENT } from './mock-data'

// --- ステータス表示ユーティリティ ---

type DerivedStatus = ConsoleCommandListItem['derived_status']

const STATUS_CONFIG: Record<DerivedStatus, { dotClass: string; badgeClass: string; borderClass: string }> = {
  running: {
    dotClass: 'bg-[#2563eb]',
    badgeClass: 'bg-[#dbeafe] text-[#2563eb]',
    borderClass: 'border-[#2563eb] border-2',
  },
  starting: {
    dotClass: 'bg-[#2563eb]',
    badgeClass: 'bg-[#dbeafe] text-[#2563eb]',
    borderClass: 'border-[#2563eb] border-2',
  },
  stopping: {
    dotClass: 'bg-[#f59e0b]',
    badgeClass: 'bg-[#fef3c7] text-[#f59e0b]',
    borderClass: 'border-[#e5e5e5] border',
  },
  completed: {
    dotClass: 'bg-[#22c55e]',
    badgeClass: 'bg-[#dcfce7] text-[#16a34a]',
    borderClass: 'border-[#e5e5e5] border',
  },
  failed: {
    dotClass: 'bg-[#e7000b]',
    badgeClass: 'bg-[#fde8e8] text-[#e7000b]',
    borderClass: 'border-[#e5e5e5] border',
  },
  killed: {
    dotClass: 'bg-[#737373]',
    badgeClass: 'bg-[#f5f5f5] text-[#737373]',
    borderClass: 'border-[#e5e5e5] border',
  },
  idle: {
    dotClass: 'bg-[#a3a3a3]',
    badgeClass: 'bg-[#f5f5f5] text-[#737373]',
    borderClass: 'border-[#e5e5e5] border',
  },
}

function StatusBadge({ status }: { status: DerivedStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.badgeClass}`}>
      {status}
    </span>
  )
}

function StatusDot({ status }: { status: DerivedStatus }) {
  const cfg = STATUS_CONFIG[status]
  return <span className={`inline-block h-2 w-2 rounded-full ${cfg.dotClass}`} />
}

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// --- 共通Props ---

interface ConsolePageViewProps {
  commands: ConsoleCommandListItem[]
  selectedCommand: ConsoleCommandListItem | null
  onSelectCommand: (id: number) => void
  logContent: string
  onRun: (id: number) => void
  onStop: (id: number) => void
  onOpenCreate: () => void
  onOpenEdit: (cmd: ConsoleCommandListItem) => void
  onOpenDelete: (cmd: ConsoleCommandListItem) => void
}

// --- コマンドカードの三点メニュー ---

function CommandActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu
      trigger={
        <button type="button" className="rounded p-1 hover:bg-[#f5f5f5]">
          <MoreVertical className="h-4 w-4 text-[#737373]" />
        </button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      <DropdownMenuItem icon={Pencil} onClick={() => { onEdit(); setOpen(false) }}>
        編集
      </DropdownMenuItem>
      <DropdownMenuItem icon={Trash2} variant="destructive" onClick={() => { onDelete(); setOpen(false) }}>
        削除
      </DropdownMenuItem>
    </DropdownMenu>
  )
}

// --- コマンドカード ---

function CommandCard({
  command,
  selected,
  onSelect,
  onRun,
  onStop,
  onEdit,
  onDelete,
}: {
  command: ConsoleCommandListItem
  selected: boolean
  onSelect: () => void
  onRun: () => void
  onStop: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const cfg = STATUS_CONFIG[command.derived_status]
  const isActive = command.derived_status === 'running' || command.derived_status === 'starting'
  const time = command.latest_run?.started_at ? formatTime(command.latest_run.started_at) : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full flex-col gap-2 rounded-lg bg-[#fafafa] p-3 text-left ${
        selected ? cfg.borderClass : 'border border-[#e5e5e5]'
      }`}
    >
      {/* Top: name + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={command.derived_status} />
          <span className="text-sm font-semibold text-foreground">{command.name}</span>
        </div>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isActive ? (
            <button type="button" onClick={onStop} className="rounded p-1 hover:bg-[#f5f5f5]">
              <Square className="h-4 w-4 text-[#e7000b]" />
            </button>
          ) : (
            <button type="button" onClick={onRun} className="rounded p-1 hover:bg-[#f5f5f5]">
              <Play className="h-4 w-4 text-[#737373]" />
            </button>
          )}
          <CommandActions onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      {/* Command string */}
      <span className="text-xs text-muted-foreground">{command.command}</span>

      {/* Bottom: badge + time */}
      <div className="flex items-center justify-between">
        <StatusBadge status={command.derived_status} />
        {time && <span className="text-[11px] text-muted-foreground">{time}</span>}
      </div>
    </button>
  )
}

// --- ログパネル ---

function LogPanel({
  command,
  logContent,
  onStop,
}: {
  command: ConsoleCommandListItem | null
  logContent: string
  onStop: () => void
}) {
  if (!command) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        コマンドを選択してください
      </div>
    )
  }

  const isActive = command.derived_status === 'running' || command.derived_status === 'starting'
  const run = command.latest_run

  return (
    <div className="flex h-full flex-col">
      {/* Log Header */}
      <div className="flex h-14 items-center justify-between border-b border-[#e5e5e5] px-5">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-foreground">{command.name}</span>
          <StatusBadge status={command.derived_status} />
        </div>
        {isActive && (
          <button type="button" onClick={onStop} className="rounded p-1.5 hover:bg-[#f5f5f5]">
            <Square className="h-4 w-4 text-[#e7000b]" />
          </button>
        )}
      </div>

      {/* Log Meta */}
      {run && (
        <div className="flex h-9 items-center gap-4 bg-[#f5f5f5] px-5">
          <span className="text-xs font-medium text-muted-foreground">$ {command.command}</span>
          <div className="h-4 w-px bg-[#e5e5e5]" />
          <span className="text-xs text-muted-foreground">開始: {formatTime(run.started_at)}</span>
          {run.pid && (
            <>
              <div className="h-4 w-px bg-[#e5e5e5]" />
              <span className="text-xs text-muted-foreground">PID: {run.pid}</span>
            </>
          )}
        </div>
      )}

      {/* Log Body */}
      <div className="flex-1 overflow-y-auto bg-[#fafafa] p-5">
        <pre className="whitespace-pre-wrap font-mono text-[13px] leading-[1.6] text-foreground">
          {logContent}
        </pre>
      </div>
    </div>
  )
}

// --- PC版 ---

function PCConsolePage({
  commands,
  selectedCommand,
  onSelectCommand,
  logContent,
  onRun,
  onStop,
  onOpenCreate,
  onOpenEdit,
  onOpenDelete,
}: ConsolePageViewProps) {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <Sidebar
        activeItem="コンソール"
        onItemClick={(label) => {
          const path = NAV_MAP[label]
          if (path) navigate(path)
        }}
      />

      {/* Main Area */}
      <div className="flex flex-1">
        {/* Command Panel */}
        <div className="flex w-95 flex-col border-r border-[#e5e5e5] bg-[#fafafa]">
          {/* Command Header */}
          <div className="flex h-14 items-center justify-between border-b border-[#e5e5e5] px-4">
            <span className="text-base font-semibold text-foreground">コンソール</span>
            <Button variant="primary" size="icon" className="h-8 w-8" onClick={onOpenCreate}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Command List */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {commands.map((cmd) => (
              <CommandCard
                key={cmd.id}
                command={cmd}
                selected={cmd.id === selectedCommand?.id}
                onSelect={() => onSelectCommand(cmd.id)}
                onRun={() => onRun(cmd.id)}
                onStop={() => onStop(cmd.id)}
                onEdit={() => onOpenEdit(cmd)}
                onDelete={() => onOpenDelete(cmd)}
              />
            ))}
          </div>
        </div>

        {/* Log Panel */}
        <div className="flex flex-1 flex-col">
          <LogPanel
            command={selectedCommand}
            logContent={logContent}
            onStop={() => selectedCommand && onStop(selectedCommand.id)}
          />
        </div>
      </div>
    </div>
  )
}

// --- SP版 ---

function SPConsolePage({
  commands,
  selectedCommand,
  onSelectCommand,
  logContent,
  onRun,
  onStop,
  onOpenCreate,
  onOpenEdit,
  onOpenDelete,
  onBack,
}: ConsolePageViewProps & { onBack: () => void }) {
  // ログ詳細画面
  if (selectedCommand) {
    const isActive = selectedCommand.derived_status === 'running' || selectedCommand.derived_status === 'starting'
    const run = selectedCommand.latest_run

    return (
      <div className="flex min-h-screen flex-col bg-[#fafafa]">
        {/* SP Log Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#e5e5e5] px-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onBack} className="rounded p-1 hover:bg-[#f5f5f5]">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <span className="text-base font-semibold text-foreground">{selectedCommand.name}</span>
            <StatusBadge status={selectedCommand.derived_status} />
          </div>
          {isActive && (
            <button type="button" onClick={() => onStop(selectedCommand.id)} className="rounded p-1.5 hover:bg-[#f5f5f5]">
              <Square className="h-4 w-4 text-[#e7000b]" />
            </button>
          )}
        </div>

        {/* SP Log Meta */}
        {run && (
          <div className="flex h-9 items-center gap-3 bg-[#f5f5f5] px-4">
            <span className="text-[11px] font-medium text-muted-foreground">$ {selectedCommand.command}</span>
            <div className="h-3.5 w-px bg-[#e5e5e5]" />
            <span className="text-[11px] text-muted-foreground">{formatTime(run.started_at)}</span>
            {run.pid && (
              <>
                <div className="h-3.5 w-px bg-[#e5e5e5]" />
                <span className="text-[11px] text-muted-foreground">PID: {run.pid}</span>
              </>
            )}
          </div>
        )}

        {/* SP Log Body */}
        <div className="flex-1 overflow-y-auto bg-[#fafafa] p-4 pb-20">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-[1.6] text-foreground">
            {logContent}
          </pre>
        </div>

        <AppBottomNav activeItem="コンソール" />
      </div>
    )
  }

  // リスト画面
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      {/* SP Header */}
      <div className="flex h-14 items-center justify-between border-b border-[#e5e5e5] px-4">
        <span className="text-lg font-semibold text-foreground">コンソール</span>
        <Button variant="primary" size="icon" className="h-8 w-8" onClick={onOpenCreate}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* SP Command List */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 pb-20">
        {commands.map((cmd) => (
          <CommandCard
            key={cmd.id}
            command={cmd}
            selected={false}
            onSelect={() => onSelectCommand(cmd.id)}
            onRun={() => onRun(cmd.id)}
            onStop={() => onStop(cmd.id)}
            onEdit={() => onOpenEdit(cmd)}
            onDelete={() => onOpenDelete(cmd)}
          />
        ))}
      </div>

      <AppBottomNav activeItem="コンソール" />
    </div>
  )
}

// --- エクスポート ---

export function ConsolePage() {
  const [commands, setCommands] = useState<ConsoleCommandListItem[]>(MOCK_COMMANDS)
  const [selectedId, setSelectedId] = useState<number | null>(MOCK_COMMANDS[0]?.id ?? null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState<ConsoleCommandListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ConsoleCommandListItem | null>(null)

  const selectedCommand = useMemo(
    () => commands.find((c) => c.id === selectedId) ?? null,
    [commands, selectedId],
  )

  const editInitialData = useMemo(
    () => editTarget ? { name: editTarget.name, command: editTarget.command, note: editTarget.note ?? '' } : undefined,
    [editTarget],
  )

  const logContent = MOCK_LOG_CONTENT

  const handleRun = useCallback((_id: number) => {
    // TODO: サーバー接続時に実装
  }, [])

  const handleStop = useCallback((_id: number) => {
    // TODO: サーバー接続時に実装
  }, [])

  const handleOpenCreate = useCallback(() => setShowCreateModal(true), [])

  const handleCreate = useCallback((data: { name: string; command: string; note: string }) => {
    const newCmd: ConsoleCommandListItem = {
      id: Date.now(),
      name: data.name,
      command: data.command,
      note: data.note || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      latest_run: null,
      active_run: null,
      derived_status: 'idle',
    }
    setCommands((prev) => [...prev, newCmd])
    setShowCreateModal(false)
  }, [])

  const handleEdit = useCallback((data: { name: string; command: string; note: string }) => {
    if (!editTarget) return
    setCommands((prev) =>
      prev.map((c) =>
        c.id === editTarget.id
          ? { ...c, name: data.name, command: data.command, note: data.note || null, updated_at: new Date().toISOString() }
          : c,
      ),
    )
    setEditTarget(null)
  }, [editTarget])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    setCommands((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    if (selectedId === deleteTarget.id) {
      setSelectedId(null)
    }
    setDeleteTarget(null)
  }, [deleteTarget, selectedId])

  const handleBack = useCallback(() => {
    setSelectedId(null)
  }, [])

  const viewProps: ConsolePageViewProps = {
    commands,
    selectedCommand,
    onSelectCommand: setSelectedId,
    logContent,
    onRun: handleRun,
    onStop: handleStop,
    onOpenCreate: handleOpenCreate,
    onOpenEdit: setEditTarget,
    onOpenDelete: setDeleteTarget,
  }

  return (
    <>
      {/* PC版: md以上で表示 */}
      <div className="hidden md:block">
        <PCConsolePage {...viewProps} />
      </div>
      {/* SP版: md未満で表示 */}
      <div className="md:hidden">
        <SPConsolePage {...viewProps} onBack={handleBack} />
      </div>

      {/* コマンド登録モーダル */}
      <CommandModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      {/* コマンド編集モーダル */}
      <CommandModal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        initialData={editInitialData}
      />

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="コマンドを削除"
        description={`「${deleteTarget?.name ?? ''}」を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除"
        cancelLabel="キャンセル"
        variant="destructive"
      />
    </>
  )
}
