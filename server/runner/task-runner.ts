import type Database from 'better-sqlite3'
import type { SolitaryCodingConfig, TaskEvent, Task } from '@solitary-coding/shared'
import type { EventBus } from '../sse/event-bus.js'
import type { RunnerStatus } from '../api/system.js'
import * as taskQueries from '../db/queries/tasks.js'
import * as logQueries from '../db/queries/execution-logs.js'
import { createTaskBranch, mergeTaskBranch, resetTaskBranch } from './git-ops.js'
import { executePhase3 } from './phase-execute.js'
import { getCiSteps, runCi } from './ci-runner.js'
import { classifyError } from './error-classifier.js'
import { ProcessTimeoutError } from './claude-caller.js'

export class TaskRunner implements RunnerStatus {
  private running = false
  private paused = false
  private currentTaskId: number | null = null
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private db: Database.Database,
    private eventBus: EventBus,
    private config: SolitaryCodingConfig,
  ) {}

  getStatus(): 'running' | 'paused' | 'idle' {
    if (this.paused) return 'paused'
    if (this.currentTaskId !== null) return 'running'
    return 'idle'
  }

  start(): void {
    this.running = true
    this.paused = false
    console.log('タスクランナー開始')
    this.scheduleNextPoll()
  }

  stop(): void {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    console.log('タスクランナー停止')
  }

  pause(): void {
    this.paused = true
    console.log('タスクランナー一時停止')
  }

  resume(): void {
    this.paused = false
    console.log('タスクランナー再開')
  }

  private scheduleNextPoll(): void {
    if (!this.running) return
    this.timer = setTimeout(() => this.poll(), 1000)
  }

  private async poll(): Promise<void> {
    if (!this.running || this.paused) {
      this.scheduleNextPoll()
      return
    }

    // 実行中のタスクがあったらスキップ
    if (this.currentTaskId !== null) {
      this.scheduleNextPoll()
      return
    }

    const task = taskQueries.getNextPendingTask(this.db)
    if (task) {
      this.currentTaskId = task.id
      try {
        await this.executeTask(task)
      } catch (err) {
        console.error(`タスク ${task.id} の実行中に予期しないエラー:`, err)
      } finally {
        this.currentTaskId = null
      }
    }

    this.scheduleNextPoll()
  }

  // タスクイベントを配信するヘルパー
  private emit(taskId: number, event: TaskEvent): void {
    this.eventBus.publish(taskId, event)
  }

  // メインのタスク実行パイプライン（ブートストラップ版）
  // pending → executing → testing → completed
  private async executeTask(task: Task): Promise<void> {
    const { id } = task
    const timestamp = new Date().toISOString()

    try {
      // --- Gitブランチ作成 ---
      this.emit(id, { type: 'phase_start', phase: 'git', timestamp })
      const branchName = createTaskBranch(id, task.title, this.config.git.defaultBranch)
      taskQueries.updateTask(this.db, id, {
        status: 'executing',
        branch_name: branchName,
        started_at: new Date().toISOString(),
      })
      this.emit(id, {
        type: 'git_operation',
        operation: 'checkout',
        detail: `ブランチ ${branchName} を作成`,
      })
      this.emit(id, { type: 'phase_end', phase: 'git', timestamp: new Date().toISOString(), durationMs: 0 })

      // --- Phase 3 + CI のリトライループ ---
      await this.executeWithRetry(task, branchName)
    } catch (err) {
      console.error(`タスク ${id} で致命的エラー:`, err)
      taskQueries.updateTask(this.db, id, {
        status: 'stopped',
        paused_reason: err instanceof Error ? err.message : String(err),
      })
      this.emit(id, {
        type: 'error',
        errorType: 'app',
        message: err instanceof Error ? err.message : String(err),
      })
      // 後続タスクも全停止
      taskQueries.stopPendingTasks(this.db)
    }
  }

  private async executeWithRetry(task: Task, branchName: string): Promise<void> {
    const { id } = task
    const maxRetries = this.config.ci.maxRetries

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // --- Phase 3: コード実行 ---
        this.emit(id, { type: 'phase_start', phase: 'execute', timestamp: new Date().toISOString() })

        const execResult = await executePhase3(task, this.config, (event) => this.emit(id, event))

        logQueries.createLog(this.db, {
          task_id: id,
          phase: 'execute',
          session_id: execResult.sessionId,
          token_input: execResult.tokenInput,
          token_output: execResult.tokenOutput,
          duration_ms: execResult.durationMs,
        })

        this.emit(id, {
          type: 'phase_end',
          phase: 'execute',
          timestamp: new Date().toISOString(),
          durationMs: execResult.durationMs,
        })

        // --- CI実行 ---
        taskQueries.updateTask(this.db, id, { status: 'testing' })
        this.emit(id, { type: 'phase_start', phase: 'ci', timestamp: new Date().toISOString() })

        const ciSteps = getCiSteps(this.db, this.config)
        const ciResult = runCi(ciSteps, (event) => this.emit(id, event))

        this.emit(id, {
          type: 'phase_end',
          phase: 'ci',
          timestamp: new Date().toISOString(),
          durationMs: ciResult.results.reduce((sum, r) => sum + r.durationMs, 0),
        })

        if (ciResult.success) {
          // --- マージ ---
          this.emit(id, { type: 'phase_start', phase: 'git', timestamp: new Date().toISOString() })
          mergeTaskBranch(branchName, this.config.git.defaultBranch)
          this.emit(id, {
            type: 'git_operation',
            operation: 'merge',
            detail: `${branchName} をマージ`,
          })
          this.emit(id, { type: 'phase_end', phase: 'git', timestamp: new Date().toISOString(), durationMs: 0 })

          taskQueries.updateTask(this.db, id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          this.emit(id, {
            type: 'completed',
            summary: `タスク "${task.title}" 完了`,
            totalDurationMs: 0,
            tokenUsage: { input: execResult.tokenInput, output: execResult.tokenOutput },
          })
          return
        }

        // CI失敗 → リトライ判定
        const failedStep = ciResult.results.find((r) => !r.success)
        const errorOutput = failedStep?.output ?? ''
        const errorType = classifyError(errorOutput, 1)

        if (errorType === 'infra') {
          // インフラエラー → 即paused
          taskQueries.updateTask(this.db, id, {
            status: 'paused',
            paused_reason: errorOutput,
            paused_phase: 'testing',
          })
          this.emit(id, { type: 'paused', reason: errorOutput, phase: 'ci' })
          return
        }

        // アプリエラー → リトライ
        if (attempt < maxRetries) {
          taskQueries.updateTask(this.db, id, {
            retry_count: attempt + 1,
            status: 'executing',
          })
          this.emit(id, {
            type: 'retry',
            errorType: 'app',
            count: attempt + 1,
            maxRetries,
            reason: `CI失敗（${failedStep?.step.name}）、リトライ ${attempt + 1}/${maxRetries}`,
          })
          // ブランチリセットしてPhase 3からやり直し
          resetTaskBranch(id, task.title, this.config.git.defaultBranch)
        }
      } catch (err) {
        if (err instanceof ProcessTimeoutError) {
          // プロセス層エラー
          const currentTask = taskQueries.getTask(this.db, id)
          const processRetry = (currentTask?.process_retry_count ?? 0) + 1

          if (processRetry > this.config.claude.processMaxRetries) {
            taskQueries.updateTask(this.db, id, {
              status: 'paused',
              paused_reason: 'Claude CLIが応答しない',
              paused_phase: 'executing',
              process_retry_count: processRetry,
            })
            this.emit(id, { type: 'paused', reason: 'Claude CLIが応答しない', phase: 'execute' })
            return
          }

          taskQueries.updateTask(this.db, id, { process_retry_count: processRetry })
          this.emit(id, {
            type: 'retry',
            errorType: 'process',
            count: processRetry,
            maxRetries: this.config.claude.processMaxRetries,
            reason: 'プロセスタイムアウト',
          })
          // ブランチリセットしてリトライ
          resetTaskBranch(id, task.title, this.config.git.defaultBranch)
          continue
        }

        throw err
      }
    }

    // 最大リトライ到達 → stopped
    taskQueries.updateTask(this.db, id, { status: 'stopped' })
    this.emit(id, {
      type: 'error',
      errorType: 'app',
      message: `${maxRetries}回リトライしたけどダメだった`,
    })
    // 後続タスクも全停止
    taskQueries.stopPendingTasks(this.db)
  }
}
