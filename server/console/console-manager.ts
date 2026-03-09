import { spawn, type ChildProcess } from 'node:child_process'
import type { WriteStream } from 'node:fs'
import type Database from 'better-sqlite3'
import type {
  ConsoleCommand,
  ConsoleCommandListItem,
  ConsoleLogResponse,
  ConsoleRun,
  ConsoleRunStatus,
  ConsoleStreamEvent,
  CreateConsoleCommandInput,
  UpdateConsoleCommandInput,
} from '@cognac/shared'
import * as consoleCommandQueries from '../db/queries/console-commands.js'
import * as consoleRunQueries from '../db/queries/console-runs.js'
import { EventBus } from '../sse/event-bus.js'
import { buildRunLogPath, createRunLogStream, readRunLog, deleteRunLog, ensureConsoleLogRoot } from './log-store.js'
import { requestForceKill, requestGracefulStop, requestTerminate } from './process-tree.js'

const GRACEFUL_STOP_TIMEOUT_MS = 5_000
const FORCE_KILL_TIMEOUT_MS = 10_000

interface ActiveProcess {
  commandId: number
  runId: number
  child: ChildProcess
  logStream: WriteStream
  stopRequested: boolean
  terminationReason: string | null
  settlePromise: Promise<void>
  settle: () => void
  gracefulTimer: ReturnType<typeof setTimeout> | null
  forceKillTimer: ReturnType<typeof setTimeout> | null
}

export class ConsoleManagerError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ConsoleManagerError'
  }
}

export class ConsoleManager {
  private readonly eventBus = new EventBus<ConsoleStreamEvent>()
  private readonly activeProcesses = new Map<number, ActiveProcess>()
  private readonly commandLocks = new Map<number, Promise<void>>()

  constructor(
    private readonly db: Database.Database,
    private readonly cwd: string = process.cwd(),
  ) {
    ensureConsoleLogRoot(this.cwd)
  }

  subscribeToRun(runId: number, fn: (event: ConsoleStreamEvent) => void): () => void {
    return this.eventBus.subscribe(runId, fn)
  }

  listCommands(): ConsoleCommandListItem[] {
    return consoleCommandQueries.listCommands(this.db).map((command) => {
      const activeRun = consoleRunQueries.getActiveRunByCommandId(this.db, command.id) ?? null
      const latestRun = consoleRunQueries.getLatestRunByCommandId(this.db, command.id) ?? null
      return {
        ...command,
        active_run: activeRun,
        latest_run: latestRun,
        derived_status: activeRun?.status ?? latestRun?.status ?? 'idle',
      }
    })
  }

  getCommand(commandId: number): ConsoleCommand | undefined {
    return consoleCommandQueries.getCommand(this.db, commandId)
  }

  createCommand(input: CreateConsoleCommandInput): ConsoleCommand {
    return consoleCommandQueries.createCommand(this.db, normalizeCommandInput(input))
  }

  updateCommand(
    commandId: number,
    patch: UpdateConsoleCommandInput,
  ): ConsoleCommand | undefined {
    const normalizedPatch = normalizeCommandPatch(patch)
    return consoleCommandQueries.updateCommand(this.db, commandId, normalizedPatch)
  }

  async deleteCommand(commandId: number): Promise<boolean> {
    return this.withCommandLock(commandId, async () => {
      const command = consoleCommandQueries.getCommand(this.db, commandId)
      if (!command) {
        throw new ConsoleManagerError('コマンドが見つからない', 404)
      }

      const activeRun = consoleRunQueries.getActiveRunByCommandId(this.db, commandId)
      if (activeRun) {
        throw new ConsoleManagerError('実行中のコマンドは削除できない', 409)
      }

      const runs = consoleRunQueries.listRunsByCommandId(this.db, commandId)
      await Promise.all(runs.map(async (run) => {
        await deleteRunLog(run.log_file_path)
      }))

      return consoleCommandQueries.deleteCommand(this.db, commandId)
    })
  }

  listRuns(commandId: number): ConsoleRun[] {
    return consoleRunQueries.listRunsByCommandId(this.db, commandId)
  }

  getRun(runId: number): ConsoleRun | undefined {
    return consoleRunQueries.getRun(this.db, runId)
  }

  async readRunLog(runId: number): Promise<ConsoleLogResponse | undefined> {
    const run = consoleRunQueries.getRun(this.db, runId)
    if (!run) return undefined

    const { content, size } = await readRunLog(run.log_file_path)
    return {
      run,
      content,
      truncated: false,
      size,
    }
  }

  async startCommand(commandId: number): Promise<{ command: ConsoleCommand; run: ConsoleRun }> {
    return this.withCommandLock(commandId, async () => {
      const command = consoleCommandQueries.getCommand(this.db, commandId)
      if (!command) {
        throw new ConsoleManagerError('コマンドが見つからない', 404)
      }

      await this.ensureStopped(commandId, 'restart')

      const logFilePath = buildRunLogPath(this.cwd, commandId)
      let run = consoleRunQueries.createRun(this.db, {
        command_id: commandId,
        status: 'starting',
        log_file_path: logFilePath,
      })

      const child = spawn(command.command, {
        cwd: this.cwd,
        shell: true,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      const logStream = createRunLogStream(logFilePath)
      const active = this.registerActiveProcess(commandId, run.id, child, logStream)

      run = consoleRunQueries.setRunPid(this.db, run.id, child.pid ?? null) ?? run
      this.publish(run.id, {
        type: 'run_started',
        runId: run.id,
        commandId,
        pid: child.pid ?? null,
        timestamp: new Date().toISOString(),
      })

      run = consoleRunQueries.setRunStatus(this.db, run.id, 'running') ?? run
      consoleCommandQueries.touchCommand(this.db, commandId)
      this.publish(run.id, {
        type: 'run_status_changed',
        runId: run.id,
        commandId,
        status: 'running',
        timestamp: new Date().toISOString(),
      })

      child.stdout?.on('data', (chunk: Buffer | string) => {
        this.handleOutput(active, commandId, run.id, 'stdout', chunk)
      })
      child.stderr?.on('data', (chunk: Buffer | string) => {
        this.handleOutput(active, commandId, run.id, 'stderr', chunk)
      })

      child.once('error', (error) => {
        const message = error instanceof Error ? error.message : String(error)
        logStream.write(`${message}\n`)
        void this.finalizeRun(active, {
          status: active.stopRequested ? 'killed' : 'failed',
          exitCode: null,
          terminationReason: active.terminationReason ?? 'spawn_error',
        })
      })

      child.once('close', (code) => {
        void this.finalizeRun(active, {
          status: resolveExitStatus(active, code),
          exitCode: code,
          terminationReason: active.terminationReason,
        })
      })

      return { command, run }
    })
  }

  async stopCommand(commandId: number): Promise<ConsoleRun | null> {
    return this.withCommandLock(commandId, async () => {
      const command = consoleCommandQueries.getCommand(this.db, commandId)
      if (!command) {
        throw new ConsoleManagerError('コマンドが見つからない', 404)
      }
      return this.requestStop(commandId, 'user_stop')
    })
  }

  async shutdown(): Promise<void> {
    const commandIds = [...this.activeProcesses.keys()]
    await Promise.all(commandIds.map(async (commandId) => {
      await this.ensureStopped(commandId, 'shutdown')
    }))
  }

  private registerActiveProcess(
    commandId: number,
    runId: number,
    child: ChildProcess,
    logStream: WriteStream,
  ): ActiveProcess {
    let settle!: () => void
    const settlePromise = new Promise<void>((resolve) => {
      settle = resolve
    })

    const active: ActiveProcess = {
      commandId,
      runId,
      child,
      logStream,
      stopRequested: false,
      terminationReason: null,
      settlePromise,
      settle,
      gracefulTimer: null,
      forceKillTimer: null,
    }

    this.activeProcesses.set(commandId, active)
    return active
  }

  private async ensureStopped(commandId: number, reason: string): Promise<void> {
    const active = this.activeProcesses.get(commandId)
    if (!active) return
    await this.requestStopInternal(active, reason, true)
  }

  private async requestStop(commandId: number, reason: string): Promise<ConsoleRun | null> {
    const active = this.activeProcesses.get(commandId)
    if (!active) {
      return consoleRunQueries.getActiveRunByCommandId(this.db, commandId) ?? null
    }
    return this.requestStopInternal(active, reason, false)
  }

  private async requestStopInternal(
    active: ActiveProcess,
    reason: string,
    waitForExit: boolean,
  ): Promise<ConsoleRun | null> {
    if (!active.stopRequested) {
      active.stopRequested = true
      active.terminationReason = reason
      const updatedRun = consoleRunQueries.setRunStatus(this.db, active.runId, 'stopping')
      this.publish(active.runId, {
        type: 'run_status_changed',
        runId: active.runId,
        commandId: active.commandId,
        status: 'stopping',
        timestamp: new Date().toISOString(),
      })

      requestGracefulStop(active.child)
      active.gracefulTimer = setTimeout(() => {
        requestTerminate(active.child)
      }, GRACEFUL_STOP_TIMEOUT_MS)
      active.forceKillTimer = setTimeout(() => {
        active.terminationReason = active.terminationReason ?? 'force_kill'
        requestForceKill(active.child)
      }, FORCE_KILL_TIMEOUT_MS)

      if (!waitForExit) {
        return updatedRun ?? consoleRunQueries.getRun(this.db, active.runId) ?? null
      }
    }

    if (waitForExit) {
      await active.settlePromise
    }
    return consoleRunQueries.getRun(this.db, active.runId) ?? null
  }

  private handleOutput(
    active: ActiveProcess,
    commandId: number,
    runId: number,
    stream: 'stdout' | 'stderr',
    chunk: Buffer | string,
  ): void {
    const content = chunk.toString()
    active.logStream.write(content)
    this.publish(runId, {
      type: 'run_output',
      runId,
      commandId,
      stream,
      chunk: content,
      timestamp: new Date().toISOString(),
    })
  }

  private async finalizeRun(
    active: ActiveProcess,
    input: {
      status: Extract<ConsoleRunStatus, 'completed' | 'failed' | 'killed'>
      exitCode: number | null
      terminationReason?: string | null
    },
  ): Promise<void> {
    if (this.activeProcesses.get(active.commandId)?.runId !== active.runId) {
      return
    }

    this.activeProcesses.delete(active.commandId)
    if (active.gracefulTimer) clearTimeout(active.gracefulTimer)
    if (active.forceKillTimer) clearTimeout(active.forceKillTimer)

    await new Promise<void>((resolve) => {
      active.logStream.end(() => resolve())
    })

    const finalizedRun = consoleRunQueries.finishRun(this.db, active.runId, {
      status: input.status,
      exitCode: input.exitCode,
      endedAt: new Date().toISOString(),
      terminationReason: input.terminationReason,
    })

    if (finalizedRun) {
      this.publish(active.runId, {
        type: 'run_exit',
        runId: active.runId,
        commandId: active.commandId,
        status: input.status,
        exitCode: input.exitCode,
        timestamp: new Date().toISOString(),
      })
    }

    active.settle()
  }

  private publish(runId: number, event: ConsoleStreamEvent): void {
    this.eventBus.publish(runId, event)
  }

  private async withCommandLock<T>(commandId: number, fn: () => Promise<T>): Promise<T> {
    const previous = this.commandLocks.get(commandId) ?? Promise.resolve()
    let release!: () => void
    const next = new Promise<void>((resolve) => {
      release = resolve
    })
    const queued = previous.catch(() => undefined).then(() => next)
    this.commandLocks.set(commandId, queued)

    await previous.catch(() => undefined)

    try {
      return await fn()
    } finally {
      release()
      if (this.commandLocks.get(commandId) === queued) {
        this.commandLocks.delete(commandId)
      }
    }
  }
}

function normalizeCommandInput(input: CreateConsoleCommandInput): CreateConsoleCommandInput {
  return {
    name: input.name.trim(),
    command: input.command.trim(),
    ...(input.note === undefined ? {} : { note: input.note.trim() }),
  }
}

function normalizeCommandPatch(patch: UpdateConsoleCommandInput): UpdateConsoleCommandInput {
  return {
    ...(patch.name === undefined ? {} : { name: patch.name.trim() }),
    ...(patch.command === undefined ? {} : { command: patch.command.trim() }),
    ...(patch.note === undefined ? {} : { note: patch.note.trim() }),
  }
}

function resolveExitStatus(
  active: ActiveProcess,
  exitCode: number | null,
): Extract<ConsoleRunStatus, 'completed' | 'failed' | 'killed'> {
  if (active.stopRequested) {
    return 'killed'
  }
  return exitCode === 0 ? 'completed' : 'failed'
}
