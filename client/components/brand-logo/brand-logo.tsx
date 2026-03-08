import { cn } from '@/lib/utils'

interface BrandLogoProps {
  size?: number
  className?: string
}

export function BrandLogo({ size = 20, className }: BrandLogoProps) {
  return (
    <span
      className={cn('shrink-0 leading-none inline-flex items-center justify-center select-none', className)}
      style={{ fontSize: size, width: size, height: size }}
      role="img"
      aria-label="Cognac"
    >
      🥃
    </span>
  )
}
