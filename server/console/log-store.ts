import { mkdirSync, createWriteStream } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { WriteStream } from 'node:fs'

export function ensureConsoleLogRoot(cwd: string): string {
  const root = resolve(cwd, '.cognac', 'logs', 'console')
  mkdirSync(root, { recursive: true })
  return root
}

export function buildRunLogPath(cwd: string, commandId: number): string {
  const dir = join(ensureConsoleLogRoot(cwd), String(commandId))
  mkdirSync(dir, { recursive: true })
  return join(dir, `${Date.now()}-${randomUUID()}.log`)
}

export function createRunLogStream(logFilePath: string): WriteStream {
  mkdirSync(dirname(logFilePath), { recursive: true })
  return createWriteStream(logFilePath, { flags: 'a' })
}

export async function readRunLog(
  logFilePath: string,
): Promise<{ content: string; size: number }> {
  const content = await readFile(logFilePath, 'utf8')
  return { content, size: Buffer.byteLength(content, 'utf8') }
}

export async function deleteRunLog(logFilePath: string): Promise<void> {
  await rm(logFilePath, { force: true })
}
