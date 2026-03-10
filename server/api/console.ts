import { type Context, Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { type ConsoleManager, ConsoleManagerError } from '../console/console-manager.js'

const createCommandSchema = z.object({
  name: z.string().trim().min(1, '表示名を入力してください').max(100, '表示名は100文字以内です'),
  command: z
    .string()
    .trim()
    .min(1, 'コマンドを入力してください')
    .max(1000, 'コマンドは1000文字以内です'),
  note: z.string().max(2000, 'メモは2000文字以内です').optional(),
})

const updateCommandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '表示名を入力してください')
    .max(100, '表示名は100文字以内です')
    .optional(),
  command: z
    .string()
    .trim()
    .min(1, 'コマンドを入力してください')
    .max(1000, 'コマンドは1000文字以内です')
    .optional(),
  note: z.string().max(2000, 'メモは2000文字以内です').optional(),
})

export function consoleRouter(consoleManager: ConsoleManager) {
  const app = new Hono()

  app.get('/commands', (c) => {
    return c.json(consoleManager.listCommands())
  })

  app.post('/commands', async (c) => {
    const body = await c.req.json()
    const parsed = createCommandSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }

    const command = consoleManager.createCommand(parsed.data)
    return c.json(command, 201)
  })

  app.put('/commands/:id', async (c) => {
    const commandId = Number(c.req.param('id'))
    const body = await c.req.json()
    const parsed = updateCommandSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'バリデーションエラー', details: parsed.error.issues }, 400)
    }

    const command = consoleManager.updateCommand(commandId, parsed.data)
    if (!command) {
      return c.json({ error: 'コマンドが見つからない' }, 404)
    }
    return c.json(command)
  })

  app.delete('/commands/:id', async (c) => {
    const commandId = Number(c.req.param('id'))

    try {
      const ok = await consoleManager.deleteCommand(commandId)
      return c.json({ ok })
    } catch (error) {
      return handleConsoleError(c, error)
    }
  })

  app.post('/commands/:id/run', async (c) => {
    const commandId = Number(c.req.param('id'))

    try {
      const result = await consoleManager.startCommand(commandId)
      return c.json(result)
    } catch (error) {
      return handleConsoleError(c, error)
    }
  })

  app.post('/commands/:id/stop', async (c) => {
    const commandId = Number(c.req.param('id'))

    try {
      const run = await consoleManager.stopCommand(commandId)
      return c.json({ ok: true, run })
    } catch (error) {
      return handleConsoleError(c, error)
    }
  })

  app.get('/commands/:id/runs', (c) => {
    const commandId = Number(c.req.param('id'))
    const command = consoleManager.getCommand(commandId)
    if (!command) {
      return c.json({ error: 'コマンドが見つからない' }, 404)
    }

    return c.json(consoleManager.listRuns(commandId))
  })

  app.get('/runs/:id/log', async (c) => {
    const runId = Number(c.req.param('id'))

    try {
      const log = await consoleManager.readRunLog(runId)
      if (!log) {
        return c.json({ error: 'run が見つからない' }, 404)
      }
      return c.json(log)
    } catch (error) {
      return c.json({ error: 'ログ取得に失敗しました', detail: String(error) }, 500)
    }
  })

  app.get('/runs/:id/stream', (c) => {
    const runId = Number(c.req.param('id'))
    const run = consoleManager.getRun(runId)
    if (!run) {
      return c.json({ error: 'run が見つからない' }, 404)
    }

    return streamSSE(c, async (stream) => {
      const { promise, resolve } = Promise.withResolvers<void>()

      const unsubscribe = consoleManager.subscribeToRun(runId, (event) => {
        stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        })

        if (event.type === 'run_exit') {
          resolve()
        }
      })

      stream.onAbort(() => {
        unsubscribe()
        resolve()
      })

      await promise
      unsubscribe()
    })
  })

  return app
}

function handleConsoleError(c: Context, error: unknown) {
  if (error instanceof ConsoleManagerError) {
    return c.json({ error: error.message }, error.status as 400 | 404 | 409)
  }

  return c.json({ error: 'コンソール操作に失敗しました', detail: String(error) }, 500)
}
