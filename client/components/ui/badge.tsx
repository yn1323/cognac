import { type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-white',
        outline: 'text-foreground',
        pending: 'border-transparent bg-status-pending-bg text-status-pending',
        discussing: 'border-transparent bg-status-discussing-bg text-status-discussing',
        planned: 'border-transparent bg-status-planned-bg text-status-planned',
        executing: 'border-transparent bg-status-executing-bg text-status-executing',
        testing: 'border-transparent bg-status-testing-bg text-status-testing',
        completed: 'border-transparent bg-status-completed-bg text-status-completed',
        paused: 'border-transparent bg-status-paused-bg text-status-paused',
        stopped: 'border-transparent bg-status-stopped-bg text-status-stopped',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
