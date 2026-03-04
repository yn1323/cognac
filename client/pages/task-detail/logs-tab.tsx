// タスク詳細ページ — ログタブ
// デザイン design.pen PC=ndNzU, SP=cZcuS に準拠

// --- モックデータ ---

const MOCK_LOGS = [
  { time: '14:32:01', msg: 'Starting Phase 3: Code Execution...' },
  {
    time: '14:32:02',
    msg: 'Reading prompt file: .solitary-coding/tmp/task-7-exec.md',
  },
  { time: '14:32:03', msg: 'claude -p --output-format stream-json' },
  { time: '14:32:05', msg: 'Creating file: server/src/middleware/auth.ts' },
  { time: '14:32:08', msg: 'Writing 47 lines to auth.ts' },
  { time: '14:32:12', msg: 'Creating file: server/src/utils/jwt.ts' },
  { time: '14:32:15', msg: 'Writing 83 lines to jwt.ts' },
  { time: '14:32:18', msg: 'Creating file: server/src/routes/auth.ts' },
  { time: '14:32:22', msg: 'Running: pnpm run typecheck' },
  { time: '14:32:25', msg: 'typecheck passed \u2713' },
  { time: '14:32:26', msg: 'Running: pnpm run lint' },
]

// --- PC版 ---

export function PCLogsTab() {
  return (
    <div className="flex h-full flex-col gap-4">
      {/* ツールバー */}
      <div className="flex items-center gap-2">
        {/* フェーズ選択 */}
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          <option>全フェーズ</option>
        </select>
        {/* 検索 */}
        <input
          type="text"
          placeholder="ログを検索..."
          className="h-9 w-60 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* ターミナル */}
      <div className="flex-1 overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col overflow-y-auto px-4 py-3">
          {MOCK_LOGS.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 font-mono text-xs leading-[1.6] text-muted-foreground">
                [{log.time}]
              </span>
              <span className="font-mono text-xs leading-[1.6] text-foreground">
                {log.msg}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- SP版 ---

export function SPLogsTab() {
  return (
    <div className="flex flex-1 flex-col">
      {/* ターミナル */}
      <div className="flex-1 overflow-y-auto rounded-lg border bg-card px-4 py-3">
        <div className="flex flex-col">
          {MOCK_LOGS.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 font-mono text-xs leading-[1.6] text-muted-foreground">
                {log.time}
              </span>
              <span className="font-mono text-xs leading-[1.6] text-foreground">
                {log.msg}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
