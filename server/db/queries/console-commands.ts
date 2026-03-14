import type {
  ConsoleCommand,
  CreateConsoleCommandInput,
  UpdateConsoleCommandInput,
} from '@cognac/shared'
import type { CognacDb } from '../types.js'

export function listCommands(db: CognacDb): ConsoleCommand[] {
  const stmt = db.prepare(`
    SELECT * FROM console_commands
    ORDER BY created_at DESC, id DESC
  `)
  return stmt.all() as unknown as ConsoleCommand[]
}

export function getCommand(db: CognacDb, id: number): ConsoleCommand | undefined {
  const stmt = db.prepare(`SELECT * FROM console_commands WHERE id = ?`)
  return stmt.get(id) as unknown as ConsoleCommand | undefined
}

export function createCommand(db: CognacDb, input: CreateConsoleCommandInput): ConsoleCommand {
  const stmt = db.prepare(`
    INSERT INTO console_commands (name, command, note)
    VALUES (@name, @command, @note)
  `)
  const result = stmt.run({
    name: input.name,
    command: input.command,
    note: input.note ?? null,
  })
  return getCommand(db, Number(result.lastInsertRowid)) as ConsoleCommand
}

export function updateCommand(
  db: CognacDb,
  id: number,
  patch: UpdateConsoleCommandInput,
): ConsoleCommand | undefined {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined)
  const setClauses = entries.map(([key]) => `${key} = @${key}`)
  setClauses.push(`updated_at = datetime('now')`)

  const stmt = db.prepare(`
    UPDATE console_commands
    SET ${setClauses.join(', ')}
    WHERE id = @id
  `)

  const params: Record<string, unknown> = { id }
  for (const [key, value] of entries) {
    params[key] = value
  }

  const result = stmt.run(params)
  if (result.changes === 0) return undefined
  return getCommand(db, id)
}

export function touchCommand(db: CognacDb, id: number): void {
  db.prepare(`
    UPDATE console_commands
    SET updated_at = datetime('now')
    WHERE id = ?
  `).run(id)
}

export function deleteCommand(db: CognacDb, id: number): boolean {
  const stmt = db.prepare(`DELETE FROM console_commands WHERE id = ?`)
  const result = stmt.run(id)
  return Number(result.changes) > 0
}
