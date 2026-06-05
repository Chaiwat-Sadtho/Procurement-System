import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  max?: number
  className?: string
  /** group label (interactive mode) */
  label?: string
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  max = 5,
  className,
  label = 'ให้คะแนน',
}: StarRatingProps) {
  const [hover, setHover] = React.useState(0)
  const stars = Array.from({ length: max }, (_, i) => i + 1)

  if (readOnly) {
    return (
      <span
        role="img"
        aria-label={`คะแนน ${value} จาก ${max}`}
        className={cn('inline-flex items-center gap-0.5', className)}
      >
        {stars.map((n) => (
          <Star
            key={n}
            aria-hidden="true"
            className={cn('h-4 w-4', n <= value ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground')}
          />
        ))}
      </span>
    )
  }

  const active = hover || value

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex items-center gap-1', className)}
      onMouseLeave={() => setHover(0)}
    >
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ดาว`}
          tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => setHover(n)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault()
              onChange?.(Math.min(max, (value || 0) + 1))
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault()
              onChange?.(Math.max(1, (value || 1) - 1))
            }
          }}
          className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            aria-hidden="true"
            className={cn('h-6 w-6 transition-colors', n <= active ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground')}
          />
        </button>
      ))}
    </div>
  )
}
