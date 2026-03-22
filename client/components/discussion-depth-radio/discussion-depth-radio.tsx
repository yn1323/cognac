// ディスカッション深度選択用ラジオボタングループ
// task-modal / exploration-modal / edit-*-modal で共通利用

import type { DiscussionDepth } from '@cognac/shared'
import { DISCUSSION_DEPTH_LABELS, DISCUSSION_DEPTH_OPTIONS } from '@cognac/shared'
import { cn } from '@/lib/utils'

export function DiscussionDepthRadio({
  value,
  onChange,
  disabled = false,
}: {
  value: DiscussionDepth
  onChange: (v: DiscussionDepth) => void
  disabled?: boolean
}) {
  return (
    <div className="flex gap-4">
      {DISCUSSION_DEPTH_OPTIONS.map((option) => (
        <label
          key={option}
          className={cn(
            'flex cursor-pointer items-center gap-2',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <input
            type="radio"
            name="discussion-depth"
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            disabled={disabled}
            className="sr-only"
          />
          <div
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-full border bg-primary-foreground',
              value === option ? 'border-blue-600' : 'border-input',
            )}
          >
            {value === option && <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
          </div>
          <span className="text-sm font-medium text-foreground">
            {option}回（{DISCUSSION_DEPTH_LABELS[option]}）
          </span>
        </label>
      ))}
    </div>
  )
}
