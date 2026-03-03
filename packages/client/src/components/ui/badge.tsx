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
        pending: 'border-transparent bg-gray-100 text-gray-700',
        discussing: 'border-transparent bg-blue-100 text-blue-700',
        planned: 'border-transparent bg-indigo-100 text-indigo-700',
        executing: 'border-transparent bg-yellow-100 text-yellow-800',
        testing: 'border-transparent bg-orange-100 text-orange-700',
        completed: 'border-transparent bg-green-100 text-green-700',
        paused: 'border-transparent bg-red-100 text-red-700',
        stopped: 'border-transparent bg-red-200 text-red-900',
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
