import type { ReactNode } from 'react'
import { Button, type ButtonProps } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

export type ActionButton = {
  key: string
  label: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: ButtonProps['variant']
  disabled?: boolean
}

export interface ActionButtonsProps {
  buttons: ActionButton[]
  /** track width on sm+: 4 (default) = quarter-width right-aligned buttons, 3 = third, 2 = half */
  cols?: 2 | 3 | 4
  className?: string
}

// Full literal class names so Tailwind can see them — never interpolate these
const SM_GRID: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
}

const COL_START: Record<number, string> = {
  1: 'sm:col-start-1',
  2: 'sm:col-start-2',
  3: 'sm:col-start-3',
  4: 'sm:col-start-4',
}

export function ActionButtons({ buttons, cols = 4, className }: ActionButtonsProps) {
  if (buttons.length === 0) return null
  const n = buttons.length
  return (
    <div className={cn('grid grid-cols-1 gap-2', SM_GRID[cols], className)}>
      {buttons.map((b, i) => {
        // right-aligned: the first button starts at cols-n+1, every button gets an explicit start
        const start = cols - n + 1 + i
        return (
          <Button
            key={b.key}
            type={b.type ?? 'button'}
            variant={b.variant}
            disabled={b.disabled}
            onClick={b.onClick}
            className={cn('w-full', start >= 1 && COL_START[start])}
          >
            {b.label}
          </Button>
        )
      })}
    </div>
  )
}
