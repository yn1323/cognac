import type Database from 'better-sqlite3'
import type {
  AgentStreamEvent,
  CognacConfig,
  ConfigPatch,
  ExplorationArtifact,
  ExplorationEvent,
  ExplorationImage,
  ExplorationPhase,
  ExplorationSession,
} from '@cognac/shared'
import type { EventBus } from '../sse/event-bus.js'
import type { RunnerStatus } from '../api/system.js'
import * as explorationQueries from '../db/queries/explorations.js'
import * as explorationImageQueries from '../db/queries/exploration-images.js'
import * as explorationPersonaQueries from '../db/queries/exploration-personas.js'
import * as explorationDiscussionQueries from '../db/queries/exploration-discussions.js'
import * as explorationArtifactQueries from '../db/queries/exploration-artifacts.js'
import * as explorationLogQueries from '../db/queries/exploration-logs.js'
import * as explorationTaskifyJobQueries from '../db/queries/exploration-taskify-jobs.js'
import { classifyError } from './error-classifier.js'
import { ExplorationPhaseError } from './exploration-output.js'
import { ProcessTimeoutError, TaskCancelledError } from './providers/types.js'
import { executeExplorationPhasePersona } from './phase-exploration-persona.js'
import { executeExplorationPhaseDiscussion } from './phase-exploration-discussion.js'
import { executeExplorationPhaseExplore } from './phase-exploration-execute.js'
import { executeExplorationPhaseReport } from './phase-exploration-report.js'
import { executeExplorationPhaseTaskify } from './phase-exploration-taskify.js'
import { getStatus as getGitStatus } from './git-api-ops.js'
import type { ExecutionCoordinator } from './execution-coordinator.js'

function phaseStart(phase: ExplorationPhase): ExplorationEvent {
  return { type: 'phase_start', phase, timestamp: new Date().toISOString() }
}

function phaseEnd(phase: ExplorationPhase, durationMs: number): ExplorationEvent {
  return { type: 'phase_end', phase, timestamp: new Date().toISOString(), durationMs }
}

function getSessionArtifacts(artifacts: ExplorationArtifact[]): {
  summaryArtifact: ExplorationArtifact | undefined
  reportArtifact: ExplorationArtifact | undefined
  findings: ExplorationArtifact[]
} {
  return {
    summaryArtifact: artifacts.find((artifact) => artifact.kind === 'plan'),
    reportArtifact: artifacts.find((artifact) => artifact.kind === 'report'),
    findings: artifacts.filter((artifact) => artifact.kind === 'finding'),
  }
}

function serializeGitStatus(cwd: string): string {
  return JSON.stringify(getGitStatus(cwd).sort((a, b) => a.path.localeCompare(b.path)))
}

function hasUnexpectedRepoChange(before: string, after: string): boolean {
  if (before === after) return false
  const beforeEntries = JSON.parse(before) as Array<{ path: string; status: string }>
  const afterEntries = JSON.parse(after) as Array<{ path: string; status: string }>
  const changedPaths = new Set<string>()

  for (const entry of beforeEntries) changedPaths.add(entry.path)
  for (const entry of afterEntries) changedPaths.add(entry.path)

  for (const path of changedPaths) {
    if (!path.startsWith('.cognac/')) {
      return true
    }
  }

  return false
}

function toExplorationStreamEvent(event: AgentStreamEvent): ExplorationEvent | null {
  switch (event.type) {
    case 'agent_output':
      return { type: 'agent_output', content: event.content }
    case 'tool_invoked':
      return { type: 'tool_invoked', toolName: event.toolName }
    case 'command_executed':
      return {
        type: 'command_executed',
        command: event.command,
        output: event.output,
        exitCode: event.exitCode,
      }
    case 'error':
      return event
    default:
      return null
  }
}

export class ExplorationRunner implements RunnerStatus {
  private running = false
  private paused = false
  private currentExecution: { kind: 'exploration' | 'taskify'; id: number } | null = null
  private currentAbortController: AbortController | null = null
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private db: Database.Database,
    private eventBus: EventBus<ExplorationEvent>,
    private config: CognacConfig,
    private coordinator: ExecutionCoordinator,
    private cwd: string,
  ) {}

  getStatus(): 'running' | 'paused' | 'idle' {
    if (this.paused) return 'paused'
    if (this.currentExecution) return 'running'
    return 'idle'
  }

  updateConfig(patch: ConfigPatch): void {
    this.config = {
      ...this.config,
      provider: patch.provider ?? this.config.provider,
      ci: { ...this.config.ci, ...patch.ci },
      git: { ...this.config.git, ...patch.git },
    }
  }

  start(): void {
    this.running = true
    this.paused = false
    this.scheduleNextPoll()
  }

  stop(): void {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  cancelCurrentExploration(explorationId: number): boolean {
    if (
      !this.currentExecution ||
      this.currentExecution.kind !== 'exploration' ||
      this.currentExecution.id !== explorationId ||
      !this.currentAbortController
    ) {
      return false
    }
    this.currentAbortController.abort()
    return true
  }

  private scheduleNextPoll(): void {
    if (!this.running) return
    this.timer = setTimeout(() => void this.poll(), 1000)
  }

  private emit(explorationId: number, event: ExplorationEvent): void {
    this.eventBus.publish(explorationId, event)
  }

  private async poll(): Promise<void> {
    if (!this.running || this.paused || this.currentExecution) {
      this.scheduleNextPoll()
      return
    }

    const pendingJob = explorationTaskifyJobQueries.getNextPendingExplorationTaskifyJob(this.db)
    if (pendingJob) {
      const exploration = explorationQueries.getExploration(this.db, pendingJob.exploration_session_id)
      if (exploration && this.coordinator.acquire('taskify', pendingJob.id)) {
        this.currentExecution = { kind: 'taskify', id: pendingJob.id }
        try {
          await this.executeTaskifyJob(exploration, pendingJob.id)
        } finally {
          this.currentExecution = null
          this.coordinator.release('taskify', pendingJob.id)
        }
      }
      this.scheduleNextPoll()
      return
    }

    const exploration = explorationQueries.getNextDraftExploration(this.db)
    if (exploration && this.coordinator.acquire('exploration', exploration.id)) {
      this.currentExecution = { kind: 'exploration', id: exploration.id }
      try {
        await this.executeExploration(exploration)
      } finally {
        this.currentExecution = null
        this.coordinator.release('exploration', exploration.id)
      }
    }

    this.scheduleNextPoll()
  }

  private async executeExploration(exploration: ExplorationSession): Promise<void> {
    const abortController = new AbortController()
    this.currentAbortController = abortController
    const { signal } = abortController
    let currentPhase: ExplorationPhase = 'persona'

    try {
      const started = new Date().toISOString()
      explorationQueries.updateExploration(this.db, exploration.id, {
        status: 'discussing',
        started_at: started,
        paused_reason: null,
        completed_at: null,
      })

      const inputImages = explorationImageQueries.listExplorationImages(this.db, exploration.id)

      currentPhase = 'persona'
      this.emit(exploration.id, phaseStart('persona'))
      const personaResult = await executeExplorationPhasePersona(
        exploration,
        inputImages,
        this.db,
        this.config,
        signal,
      )
      this.emit(exploration.id, { type: 'persona_selected', personas: personaResult.personas })
      this.emit(exploration.id, phaseEnd('persona', personaResult.durationMs))

      currentPhase = 'discussion'
      this.emit(exploration.id, phaseStart('discussion'))
      const discussionResult = await executeExplorationPhaseDiscussion(
        exploration,
        personaResult.personas,
        inputImages,
        this.db,
        this.config,
        (event) => this.emit(exploration.id, event),
        signal,
      )
      this.emit(exploration.id, phaseEnd('discussion', discussionResult.totalDurationMs))

      currentPhase = 'explore'
      explorationQueries.updateExploration(this.db, exploration.id, {
        status: 'executing',
      })

      const beforeStatus = serializeGitStatus(this.cwd)
      this.emit(exploration.id, phaseStart('explore'))
      const exploreResult = await executeExplorationPhaseExplore(
        exploration,
        personaResult.personas,
        discussionResult.discussions,
        inputImages,
        this.db,
        this.config,
        this.cwd,
        (event) => {
          const mapped = toExplorationStreamEvent(event)
          if (mapped) this.emit(exploration.id, mapped)
          if (event.type === 'tool_invoked' && event.toolName.toLowerCase().includes('playwright')) {
            this.emit(exploration.id, { type: 'playwright_log', message: `Playwright MCP: ${event.toolName}` })
          }
        },
        signal,
      )
      this.emit(exploration.id, phaseEnd('explore', exploreResult.durationMs))

      const afterStatus = serializeGitStatus(this.cwd)
      if (hasUnexpectedRepoChange(beforeStatus, afterStatus)) {
        throw new Error('探索中に .cognac 以外の変更が検出されたため中断した')
      }

      const artifacts = explorationArtifactQueries.listExplorationArtifacts(this.db, exploration.id)
      const { summaryArtifact, findings } = getSessionArtifacts(artifacts)
      const evidenceImages = explorationArtifactQueries.listExplorationEvidenceImages(this.db, exploration.id)

      if (summaryArtifact) {
        this.emit(exploration.id, { type: 'artifact_created', kind: 'plan', title: summaryArtifact.title ?? undefined })
      }
      for (const finding of findings) {
        this.emit(exploration.id, { type: 'artifact_created', kind: 'finding', title: finding.title ?? undefined })
      }
      for (const image of evidenceImages) {
        this.emit(exploration.id, { type: 'artifact_created', kind: 'playwright-log', path: image.file_path })
      }

      currentPhase = 'report'
      explorationQueries.updateExploration(this.db, exploration.id, {
        status: 'reviewing',
      })
      this.emit(exploration.id, phaseStart('report'))
      const reportResult = await executeExplorationPhaseReport(
        exploration,
        personaResult.personas,
        discussionResult.discussions,
        summaryArtifact,
        findings,
        evidenceImages,
        this.db,
        this.config,
        signal,
      )
      this.emit(exploration.id, phaseEnd('report', reportResult.durationMs))

      explorationQueries.markExplorationCompleted(
        this.db,
        exploration.id,
        reportResult.finalMarkdown,
        findings.length,
      )

      this.emit(exploration.id, { type: 'report_created', issueCount: findings.length })
      this.emit(exploration.id, {
        type: 'completed',
        summary: `探索 "${exploration.title}" が完了`,
        totalDurationMs:
          personaResult.durationMs +
          discussionResult.totalDurationMs +
          exploreResult.durationMs +
          reportResult.durationMs,
      })
    } catch (error) {
      if (error instanceof TaskCancelledError) {
        return
      }

      const message = error instanceof Error ? error.message : String(error)
      const phase = error instanceof ExplorationPhaseError ? error.phase : currentPhase
      const outputRaw = error instanceof ExplorationPhaseError ? error.outputRaw : undefined
      if (error instanceof ProcessTimeoutError) {
        explorationQueries.markExplorationPaused(this.db, exploration.id, message)
        explorationLogQueries.createExplorationLog(this.db, {
          exploration_session_id: exploration.id,
          phase,
          error_type: 'process',
          error_message: message,
          output_raw: outputRaw,
        })
        this.emit(exploration.id, { type: 'paused', reason: message, phase })
        return
      }

      const rawForClassification = outputRaw ?? message
      const errorType = error instanceof ExplorationPhaseError
        ? error.errorType
        : classifyError(rawForClassification, 1)

      if (errorType === 'infra') {
        explorationQueries.markExplorationPaused(this.db, exploration.id, message)
        explorationLogQueries.createExplorationLog(this.db, {
          exploration_session_id: exploration.id,
          phase,
          error_type: 'infra',
          error_message: message,
          output_raw: outputRaw,
        })
        this.emit(exploration.id, { type: 'paused', reason: message, phase })
        return
      }

      explorationQueries.markExplorationStopped(this.db, exploration.id, message)
      explorationLogQueries.createExplorationLog(this.db, {
        exploration_session_id: exploration.id,
        phase,
        error_type: 'app',
        error_message: message,
        output_raw: outputRaw,
      })
      this.emit(exploration.id, { type: 'error', errorType: 'app', message, phase })
    } finally {
      this.currentAbortController = null
    }
  }

  private async executeTaskifyJob(
    exploration: ExplorationSession,
    taskifyJobId: number,
  ): Promise<void> {
    const job = explorationTaskifyJobQueries.markExplorationTaskifyJobRunning(this.db, taskifyJobId)
    if (!job) return

    const { signal } = new AbortController()

    try {
      this.emit(exploration.id, { type: 'taskify_started', jobId: job.id })

      const artifacts = explorationArtifactQueries.listExplorationArtifacts(this.db, exploration.id)
      const { findings, reportArtifact } = getSessionArtifacts(artifacts)
      const images = explorationImageQueries.listExplorationImages(this.db, exploration.id)
      const { taskIds, resultJson } = await executeExplorationPhaseTaskify(
        exploration,
        job,
        findings,
        reportArtifact,
        images,
        this.db,
        this.config,
        this.cwd,
        signal,
      )

      explorationTaskifyJobQueries.markExplorationTaskifyJobCompleted(this.db, job.id, resultJson)
      this.emit(exploration.id, { type: 'taskify_completed', jobId: job.id, taskIds })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      explorationTaskifyJobQueries.markExplorationTaskifyJobFailed(this.db, job.id, message)
      this.emit(exploration.id, { type: 'taskify_failed', jobId: job.id, message })
    }
  }
}
