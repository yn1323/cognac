import type { Meta, StoryObj } from '@storybook/react'
import { SPTaskCard } from './sp-task-card'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown } from 'lucide-react'

const meta = {
  title: 'Components/SPTaskCard',
  component: SPTaskCard,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 390, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SPTaskCard>

export default meta
type Story = StoryObj<typeof meta>

export const Executing: Story = {
  args: {
    title: 'Implement auth API',
    subtitle: 'Phase 3 · 14:32 started',
    badge: (
      <span className="rounded-full bg-[#2563eb] px-2 py-0.5 text-xs font-medium text-white">
        Executing
      </span>
    ),
    borderColor: 'border-[#2563eb] border-2',
  },
}

export const Discussing: Story = {
  args: {
    title: 'Add drag-and-drop reorder',
    subtitle: 'Round 2 of 3 · 3 personas',
    badge: (
      <span className="rounded-full bg-[#eab308] px-2 py-0.5 text-xs font-medium text-white">
        Discussing
      </span>
    ),
  },
}

export const Pending: Story = {
  args: {
    title: 'Setup SSE endpoints',
    subtitle: 'Queued · Created 14:10',
    badge: (
      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Pending
      </span>
    ),
    actions: (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-auto px-2 py-1 text-xs">
          <ChevronUp className="mr-1 h-3 w-3" />
          Up
        </Button>
        <Button variant="outline" size="sm" className="h-auto px-2 py-1 text-xs">
          <ChevronDown className="mr-1 h-3 w-3" />
          Down
        </Button>
      </div>
    ),
  },
}

export const Stopped: Story = {
  args: {
    title: 'Add error classification',
    subtitle: 'CI failed (5/5) · 30 min ago',
    badge: (
      <span className="rounded-full bg-[#ef4444] px-2 py-0.5 text-xs font-medium text-white">
        Stopped
      </span>
    ),
    borderColor: 'border-[#ef444440]',
    actions: (
      <Button variant="outline" size="sm" className="h-auto px-2.5 py-1 text-xs">
        Retry
      </Button>
    ),
  },
}
