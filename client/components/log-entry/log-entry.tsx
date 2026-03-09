// DB履歴ログの1行表示（タスク・探索共通）

import type { BaseLog } from '@cognac/shared'

export function LogEntry({ log }: { log: BaseLog }) {
  const hasError = log.error_type != null
  return (
    <div className="flex gap-2 border-b border-border/50 py-1">
      <span className="w-16 shrink-0 font-mono text-xs font-semibold text-blue-600">
        [{log.phase}]
      </span>
      <div className="flex-1 font-mono text-xs">
        {hasError ? (
          <span className={log.error_type === 'infra' ? 'text-orange-600' : 'text-red-600'}>
            {log.error_type}: {log.error_message}
          </span>
        ) : (
          <span className="text-foreground">
            {log.output_summary ?? '完了'}
            {log.duration_ms != null && (
              <span className="ml-2 text-muted-foreground">({log.duration_ms}ms)</span>
            )}
            {log.token_input != null && (
              <span className="ml-2 text-muted-foreground">
                tokens: {log.token_input}→{log.token_output}
              </span>
            )}
          </span>
        )}
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {log.created_at}
      </span>
    </div>
  )
}
