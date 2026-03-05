// ブランドロゴ: C + しずくモチーフ（インラインSVG）

import { cn } from '@/lib/utils'

interface BrandLogoProps {
  size?: number
  className?: string
}

export function BrandLogo({ size = 20, className }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
    >
      <path
        d="M23.5 8.5c-1.8-2.2-4.5-3.5-7.5-3.5C9.4 5 4 10.4 4 17s5.4 12 12 12c3 0 5.7-1.3 7.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={4.5}
        strokeLinecap="round"
        className="text-cognac"
      />
      <path
        d="M24.5 10.5c0 0-1.2 2-1.2 3 0 .8.5 1.4 1.2 1.4s1.2-.6 1.2-1.4c0-1-1.2-3-1.2-3z"
        fill="currentColor"
        className="text-cognac-light"
      />
    </svg>
  )
}
