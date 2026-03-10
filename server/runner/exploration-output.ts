import type {
  ErrorType,
  ExplorationExecutionResult,
  ExplorationPhase,
  ExplorationReportResult,
} from '@cognac/shared'
import { z } from 'zod'
import { classifyError } from './error-classifier.js'
import { extractJson } from './json-parser.js'

const findingSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']).optional(),
})

const executionResultSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(findingSchema),
  nextActions: z.array(z.string()),
  evidenceFiles: z.array(z.string()),
  playwrightUsed: z.boolean(),
})

const reportResultSchema = z.object({
  reportMarkdown: z.string().min(1),
  findings: z.array(findingSchema),
  nextActions: z.array(z.string()),
})

const REQUIRED_REPORT_SECTIONS = [
  '## 結論',
  '## 調査内容',
  '## ディスカッション要約',
  '## 課題',
  '## 次アクション',
] as const

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function summarizeRawOutput(raw: string, fallback: string): string {
  const normalized = raw.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, 500)
}

function classifyExplorationError(raw: string): Exclude<ErrorType, 'process'> {
  const errorType = classifyError(raw, 1)
  return errorType === 'infra' ? 'infra' : 'app'
}

function parseStructuredJson<T>(
  phase: ExplorationPhase,
  raw: string,
  schema: z.ZodType<T>,
  invalidMessage: string,
): T {
  let parsed: unknown

  try {
    parsed = extractJson<unknown>(raw)
  } catch {
    throw new ExplorationPhaseError(
      phase,
      summarizeRawOutput(raw, invalidMessage),
      classifyExplorationError(raw),
      raw,
    )
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new ExplorationPhaseError(
      phase,
      `${invalidMessage}: ${result.error.issues[0]?.message ?? 'unknown'}`,
      classifyExplorationError(raw),
      raw,
    )
  }

  return result.data
}

function validateReportMarkdown(markdown: string): void {
  const missing = REQUIRED_REPORT_SECTIONS.filter((section) => {
    const pattern = new RegExp(`(^|\\n)${escapeRegExp(section)}(?:\\s|\\n|$)`, 'm')
    return !pattern.test(markdown)
  })

  if (missing.length > 0) {
    throw new Error(`必須セクション不足: ${missing.join(', ')}`)
  }
}

export class ExplorationPhaseError extends Error {
  constructor(
    readonly phase: ExplorationPhase,
    message: string,
    readonly errorType: Exclude<ErrorType, 'process'>,
    readonly outputRaw?: string,
  ) {
    super(message)
    this.name = 'ExplorationPhaseError'
  }
}

export function parseExplorationExecutionResult(raw: string): ExplorationExecutionResult {
  return parseStructuredJson('explore', raw, executionResultSchema, '探索結果のJSON構造が不正')
}

export function parseExplorationReportResult(raw: string): ExplorationReportResult {
  const result = parseStructuredJson(
    'report',
    raw,
    reportResultSchema,
    '最終レポートのJSON構造が不正',
  )

  try {
    validateReportMarkdown(result.reportMarkdown)
  } catch (error) {
    throw new ExplorationPhaseError(
      'report',
      error instanceof Error ? error.message : '最終レポートのMarkdown検証に失敗',
      'app',
      raw,
    )
  }

  return result
}
