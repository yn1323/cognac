import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'

export function getCognacRoot(cwd = process.cwd()): string {
  return resolve(cwd, '.cognac')
}

export function getExplorationUploadDir(explorationSessionId: number, cwd = process.cwd()): string {
  return resolve(getCognacRoot(cwd), 'uploads', 'explorations', String(explorationSessionId))
}

export function getExplorationArtifactDir(
  explorationSessionId: number,
  cwd = process.cwd(),
): string {
  return resolve(getCognacRoot(cwd), 'artifacts', 'explorations', String(explorationSessionId))
}

export function getExplorationPlaywrightDir(
  explorationSessionId: number,
  cwd = process.cwd(),
): string {
  return resolve(getExplorationArtifactDir(explorationSessionId, cwd), 'playwright')
}

export async function ensureExplorationDirs(
  explorationSessionId: number,
  cwd = process.cwd(),
): Promise<void> {
  await mkdir(getExplorationUploadDir(explorationSessionId, cwd), { recursive: true })
  await mkdir(getExplorationPlaywrightDir(explorationSessionId, cwd), { recursive: true })
}

export function toCognacRelativePath(inputPath: string, cwd = process.cwd()): string | null {
  const cognacRoot = getCognacRoot(cwd)
  const absolutePath = isAbsolute(inputPath) ? inputPath : resolve(cwd, inputPath)
  const rel = relative(cognacRoot, absolutePath)
  if (!rel || rel.startsWith('..')) return null
  return rel.split(sep).join('/')
}

export function resolveCognacPath(filePath: string, cwd = process.cwd()): string {
  return resolve(getCognacRoot(cwd), filePath)
}

export function isExistingCognacFile(
  inputPath: string,
  cwd = process.cwd(),
): { absolutePath: string; relativePath: string } | null {
  const relativePath = toCognacRelativePath(inputPath, cwd)
  if (!relativePath) return null
  const absolutePath = resolveCognacPath(relativePath, cwd)
  if (!existsSync(absolutePath)) return null
  return { absolutePath, relativePath }
}
