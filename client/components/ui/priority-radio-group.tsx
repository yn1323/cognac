// Priority選択用ラジオボタングループ
// task-modal / edit-task-modal で共通利用

import type { PriorityLabel } from '@cognac/shared'
import { cn } from '@/lib/utils'

export function PriorityRadioGroup({
  options,
  value,
  onChange,
  name = 'priority',
}: {
  options: PriorityLabel[]
  value: PriorityLabel
  onChange: (v: PriorityLabel) => void
  name?: string
}) {
  return (
    <div className="flex gap-4">
      {options.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="sr-only"
          />
          <div
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-full border bg-primary-foreground',
              value === option ? 'border-blue-600' : 'border-input',
            )}
          >
            {value === option && (
              <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            )}
          </div>
          <span className="text-sm font-medium text-foreground">{option}</span>
        </label>
      ))}
    </div>
  )
}
