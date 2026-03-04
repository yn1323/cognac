import type Database from 'better-sqlite3'
import type { CognacConfig, TaskEvent, Task, Phase } from '@cognac/shared'
import type { EventBus } from '../sse/event-bus.js'
import type { RunnerStatus } from '../api/system.js'
import * as taskQueries from '../db/queries/tasks.js'
import * as logQueries from '../db/queries/execution-logs.js'
import { buildBranchName, createTaskBranch, resetTaskBranch, mergeTaskBranch } from './git-ops.js'
import { executePhase3 } from './phase-execute.js'
import { executePhasePersona } from './phase-persona.js'
import { executePhaseDiscussion } from './phase-discussion.js'
import { executePhasePlan } from './phase-plan.js'
import { buildRetryPrompt } from './retry-prompt.js'
import { invalidateContextCache } from './context-cache.js'
import { getCiSteps, runCi } from './ci-runner.js'
import { classifyError } from './error-classifier.js'
import { ProcessTimeoutError } from './claude-caller.js'

export class TaskRunner implements RunnerStatus {
  private running = false
  private paused = false
  private currentTaskId: number | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  // フェーズごとのSSEイベントを蓄積（DB永続化用）
  private phaseEvents: TaskEvent[] = []

  constructor(
    private db: Database.Database,
    private eventBus: EventBus,
    private config: CognacConfig,
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

  // タスクイベントを配信 + 蓄積するヘルパー
  private emit(taskId: number, event: TaskEvent): void {
    this.eventBus.publish(taskId, event)
    this.phaseEvents.push(event)
  }

  // 蓄積したイベントをJSONで取得してリセット
  private drainPhaseEvents(): string {
    const json = JSON.stringify(this.phaseEvents)
    this.phaseEvents = []
    return json
  }

  // メインのタスク実行パイプライン
  // skipDiscussion=true:  pending → executing → testing → completed（ブートストラップ）
  // skipDiscussion=false: pending → discussing → planned → executing → testing → completed（フル）
  private async executeTask(task: Task): Promise<void> {
    const { id } = task
    let currentPhase: Phase = 'execute'

    try {
      // イベント蓄積をリセット
      this.phaseEvents = []

      const onEvent = (event: TaskEvent): void => this.emit(id, event)

      if (this.config.discussion.skipDiscussion) {
        // --- ブートストラップモード（Phase 2スキップ） ---
        const branchName = buildBranchName(id, task.title)
        taskQueries.updateTask(this.db, id, {
          status: 'executing',
          branch_name: branchName,
          started_at: new Date().toISOString(),
        })
        await this.executeWithRetry(task, branchName)
      } else {
        // --- フルパイプライン ---
        taskQueries.updateTask(this.db, id, {
          status: 'discussing',
          started_at: new Date().toISOString(),
        })

        // Phase 2-A: ペルソナ選定
        currentPhase = 'persona'
        this.emit(id, { type: 'phase_start', phase: 'persona', timestamp: new Date().toISOString() })
        const personaResult = await executePhasePersona(task, this.db, this.config, onEvent)
        this.emit(id, { type: 'phase_end', phase: 'persona', timestamp: new Date().toISOString(), durationMs: personaResult.durationMs })

        // Phase 2-B: ディスカッション
        currentPhase = 'discussion'
        this.emit(id, { type: 'phase_start', phase: 'discussion', timestamp: new Date().toISOString() })
        const discResult = await executePhaseDiscussion(task, personaResult.personas, this.db, this.config, onEvent)
        this.emit(id, { type: 'phase_end', phase: 'discussion', timestamp: new Date().toISOString(), durationMs: discResult.totalDurationMs })

        // Phase 2-C: プラン策定
        currentPhase = 'plan'
        this.emit(id, { type: 'phase_start', phase: 'plan', timestamp: new Date().toISOString() })
        const planResult = await executePhasePlan(task, discResult.discussions, personaResult.personas, this.db, this.config, onEvent)
        this.emit(id, { type: 'phase_end', phase: 'plan', timestamp: new Date().toISOString(), durationMs: planResult.durationMs })
        taskQueries.updateTask(this.db, id, { status: 'planned' })

        // Gitブランチ作成
        currentPhase = 'git'
        const branchName = createTaskBranch(id, task.title, this.config.git.defaultBranch)
        taskQueries.updateTask(this.db, id, { status: 'executing', branch_name: branchName })
        this.emit(id, { type: 'git_operation', operation: 'checkout', detail: `ブランチ作成: ${branchName}` })

        // Phase 3 + CI リトライループ（executionPromptを渡す）
        currentPhase = 'execute'
        await this.executeWithRetry(task, branchName, planResult.plan.execution_prompt)

        // 完了: Gitマージ + push
        currentPhase = 'git'
        mergeTaskBranch(branchName, this.config.git.defaultBranch)
        this.emit(id, { type: 'git_operation', operation: 'merge', detail: `${branchName} → ${this.config.git.defaultBranch}` })

        // コンテキストキャッシュ無効化
        invalidateContextCache()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`タスク ${id} で致命的エラー:`, err)

      // エラーログをDBに記録（ダッシュボードから確認できるように）
      logQueries.createLog(this.db, {
        task_id: id,
        phase: currentPhase,
        error_type: 'app',
        error_message: errorMessage,
      })

      taskQueries.updateTask(this.db, id, {
        status: 'stopped',
        paused_reason: errorMessage,
        paused_phase: currentPhase,
      })
      this.emit(id, {
        type: 'error',
        errorType: 'app',
        message: errorMessage,
      })
      // 後続タスクも全停止
      taskQueries.stopPendingTasks(this.db)
    }
  }

  private async executeWithRetry(
    task: Task,
    branchName: string,
    executionPrompt?: string,
  ): Promise<void> {
    const { id } = task
    const maxRetries = this.config.ci.maxRetries
    const previousErrors: string[] = []
    const isFullPipeline = !this.config.discussion.skipDiscussion

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // --- Phase 3: コード実行 ---
        this.emit(id, { type: 'phase_start', phase: 'execute', timestamp: new Date().toISOString() })

        // リトライ時はプロンプトにエラーコンテキストを追加
        const currentPrompt = executionPrompt
          ? buildRetryPrompt(executionPrompt, attempt, previousErrors)
          : undefined

        const execResult = await executePhase3(task, this.config, (event) => this.emit(id, event), currentPrompt)

        logQueries.createLog(this.db, {
          task_id: id,
          phase: 'execute',
          session_id: execResult.sessionId,
          token_input: execResult.tokenInput,
          token_output: execResult.tokenOutput,
          duration_ms: execResult.durationMs,
          output_raw: this.drainPhaseEvents(),
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

        const ciDurationMs = ciResult.results.reduce((sum, r) => sum + r.durationMs, 0)

        this.emit(id, {
          type: 'phase_end',
          phase: 'ci',
          timestamp: new Date().toISOString(),
          durationMs: ciDurationMs,
        })

        // CIフェーズのイベントをDBに記録
        logQueries.createLog(this.db, {
          task_id: id,
          phase: 'ci',
          duration_ms: ciDurationMs,
          output_raw: this.drainPhaseEvents(),
          ...(ciResult.success ? {} : {
            error_type: 'app' as const,
            error_message: ciResult.results.find((r) => !r.success)?.output?.slice(0, 500),
          }),
        })

        if (ciResult.success) {
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

        // エラー履歴に追加
        previousErrors.push(errorOutput.slice(0, 2000))

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
          if (isFullPipeline) {
            resetTaskBranch(id, task.title, this.config.git.defaultBranch)
            this.emit(id, { type: 'git_operation', operation: 'checkout', detail: `ブランチリセット: ${branchName}` })
          }
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
          if (isFullPipeline) {
            resetTaskBranch(id, task.title, this.config.git.defaultBranch)
            this.emit(id, { type: 'git_operation', operation: 'checkout', detail: `ブランチリセット: ${branchName}` })
          }
          continue
        }

        throw err
      }
    }

    // 最大リトライ到達 → stopped
    taskQueries.updateTask(this.db, id, {
      status: 'stopped',
      paused_phase: 'testing',
    })
    this.emit(id, {
      type: 'error',
      errorType: 'app',
      message: `${maxRetries}回リトライしたけどダメだった`,
    })
    // 後続タスクも全停止
    taskQueries.stopPendingTasks(this.db)
  }
}
