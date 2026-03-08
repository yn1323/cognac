// コンソール画面
// PC: サイドバー + コマンドパネル(380px) + ログパネル / SP: リスト ↔ ログ詳細
// デザイン ConsolePage.pen PC=HmvhY, SP-List=wukk3, SP-Log=3tUlE に準拠

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Play,
  Square,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  Terminal,
} from 'lucide-react'
import type { ConsoleCommandListItem } from '@cognac/shared'
import { Sidebar } from '@/components/sidebar'
import { AppBottomNav } from '@/components/app-bottom-nav'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/toast'
import { NAV_MAP } from '@/lib/constants'
import {
  useConsoleCommands,
  useRunLog,
  useCreateConsoleCommand,
  useUpdateConsoleCommand,
  useDeleteConsoleCommand,
  useRunConsoleCommand,
  useStopConsoleCommand,
} from '@/hooks/use-console'
import { useConsoleSSE } from '@/hooks/use-console-sse'
import { CommandModal } from './command-modal'

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
  // SQLiteの datetime('now') は UTC だが 'Z' なしで返るため、ローカル扱いされないよう補正
  const normalized = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`
  const d = new Date(normalized)
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
  isLoading: boolean
  isRunPending: boolean
  isStopPending: boolean
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
  isRunPending,
  isStopPending,
}: {
  command: ConsoleCommandListItem
  selected: boolean
  onSelect: () => void
  onRun: () => void
  onStop: () => void
  onEdit: () => void
  onDelete: () => void
  isRunPending: boolean
  isStopPending: boolean
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
            <button type="button" onClick={onStop} disabled={isStopPending} className="rounded p-1 hover:bg-[#f5f5f5] disabled:opacity-50">
              <Square className="h-4 w-4 text-[#e7000b]" />
            </button>
          ) : (
            <button type="button" onClick={onRun} disabled={isRunPending} className="rounded p-1 hover:bg-[#f5f5f5] disabled:opacity-50">
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
  isStopPending,
}: {
  command: ConsoleCommandListItem | null
  logContent: string
  onStop: () => void
  isStopPending: boolean
}) {
  const logRef = useRef<HTMLDivElement>(null)
  const isNearBottom = useRef(true)

  const handleScroll = () => {
    const el = logRef.current
    if (!el) return
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50
  }

  useEffect(() => {
    if (isNearBottom.current && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logContent])

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
          <button type="button" onClick={onStop} disabled={isStopPending} className="rounded p-1.5 hover:bg-[#f5f5f5] disabled:opacity-50">
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
      <div ref={logRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-[#fafafa] p-5">
        <pre className="whitespace-pre-wrap font-mono text-[13px] leading-[1.6] text-foreground">
          {logContent || (run ? '' : 'まだ実行されていません')}
        </pre>
      </div>
    </div>
  )
}

// --- 空状態 ---

function EmptyState({ onOpenCreate }: { onOpenCreate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-[#f5f5f5] p-4">
        <Terminal className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">コマンドがありません</p>
        <p className="text-xs text-muted-foreground">よく使うコマンドを登録して、ワンクリックで実行できます。</p>
      </div>
      <Button variant="primary" size="sm" onClick={onOpenCreate}>
        <Plus className="mr-1 h-4 w-4" />
        コマンドを登録
      </Button>
    </div>
  )
}

// --- ローディング ---

function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
  isLoading,
  isRunPending,
  isStopPending,
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
          {isLoading ? (
            <LoadingState />
          ) : commands.length === 0 ? (
            <EmptyState onOpenCreate={onOpenCreate} />
          ) : (
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
                  isRunPending={isRunPending}
                  isStopPending={isStopPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* Log Panel */}
        <div className="flex flex-1 flex-col">
          <LogPanel
            command={selectedCommand}
            logContent={logContent}
            onStop={() => selectedCommand && onStop(selectedCommand.id)}
            isStopPending={isStopPending}
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
  isLoading,
  isRunPending,
  isStopPending,
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
            <button type="button" onClick={() => onStop(selectedCommand.id)} disabled={isStopPending} className="rounded p-1.5 hover:bg-[#f5f5f5] disabled:opacity-50">
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
            {logContent || (run ? '' : 'まだ実行されていません')}
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
      {isLoading ? (
        <LoadingState />
      ) : commands.length === 0 ? (
        <EmptyState onOpenCreate={onOpenCreate} />
      ) : (
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
              isRunPending={isRunPending}
              isStopPending={isStopPending}
            />
          ))}
        </div>
      )}

      <AppBottomNav activeItem="コンソール" />
    </div>
  )
}

// --- エクスポート ---

export function ConsolePage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // API hooks
  const { data: commands = [], isLoading } = useConsoleCommands()
  const createMutation = useCreateConsoleCommand()
  const updateMutation = useUpdateConsoleCommand()
  const deleteMutation = useDeleteConsoleCommand()
  const runMutation = useRunConsoleCommand()
  const stopMutation = useStopConsoleCommand()

  // UI state
  const [selectedId, setSelectedId] = useState<number | null>(null)
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

  // ログ表示: 履歴ログ + SSEリアルタイムログ
  const activeRunId = selectedCommand?.active_run?.id ?? null
  const latestRunId = selectedCommand?.latest_run?.id ?? null
  const viewRunId = activeRunId ?? latestRunId

  const { data: historicalLog } = useRunLog(viewRunId)
  const { log: sseLog, runExited, clearLog } = useConsoleSSE(activeRunId)

  const logContent = activeRunId
    ? (historicalLog?.content ?? '') + sseLog
    : (historicalLog?.content ?? '')

  // run終了時にコマンド一覧とログを更新
  useEffect(() => {
    if (runExited) {
      queryClient.invalidateQueries({ queryKey: ['console-commands'] })
      queryClient.invalidateQueries({ queryKey: ['console-runs'] })
    }
  }, [runExited, queryClient])

  // コマンド選択切り替え時にSSEバッファをリセット
  useEffect(() => {
    clearLog()
  }, [selectedId, clearLog])

  // --- ハンドラ ---

  const handleRun = useCallback((id: number) => {
    runMutation.mutate(id, {
      onSuccess: () => {
        setSelectedId(id)
        queryClient.invalidateQueries({ queryKey: ['console-runs'] })
      },
      onError: (err) => toast(`実行に失敗しました: ${err.message}`, 'error'),
    })
  }, [runMutation, queryClient, toast])

  const handleStop = useCallback((id: number) => {
    stopMutation.mutate(id, {
      onError: (err) => toast(`停止に失敗しました: ${err.message}`, 'error'),
    })
  }, [stopMutation, toast])

  const handleOpenCreate = useCallback(() => setShowCreateModal(true), [])

  const handleCreate = useCallback((data: { name: string; command: string; note: string }) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setShowCreateModal(false)
        toast('コマンドを登録しました', 'success')
      },
      onError: (err) => toast(`登録に失敗しました: ${err.message}`, 'error'),
    })
  }, [createMutation, toast])

  const handleEdit = useCallback((data: { name: string; command: string; note: string }) => {
    if (!editTarget) return
    updateMutation.mutate({ id: editTarget.id, data }, {
      onSuccess: () => {
        setEditTarget(null)
        toast('コマンドを更新しました', 'success')
      },
      onError: (err) => toast(`更新に失敗しました: ${err.message}`, 'error'),
    })
  }, [editTarget, updateMutation, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (selectedId === deleteTarget.id) setSelectedId(null)
        setDeleteTarget(null)
        toast('コマンドを削除しました', 'success')
      },
      onError: (err) => {
        setDeleteTarget(null)
        toast(`削除に失敗しました: ${err.message}`, 'error')
      },
    })
  }, [deleteTarget, selectedId, deleteMutation, toast])

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
    isLoading,
    isRunPending: runMutation.isPending,
    isStopPending: stopMutation.isPending,
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
