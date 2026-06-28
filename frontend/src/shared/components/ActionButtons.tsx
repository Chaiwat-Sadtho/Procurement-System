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
  /** ความกว้าง track บน sm+ : 4 (default)=¼ ต่อปุ่ม right-aligned · 2=½ เต็มแถว (dialog/label ยาว) · 3=⅓ */
  cols?: 2 | 3 | 4
  className?: string
}

// literal class เต็ม (Tailwind purge เห็น) — ห้าม interpolate
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
        // right-align: ปุ่มแรกเริ่มที่ col (cols-n+1), ไล่ไปขวา — ใส่ explicit ทุกปุ่ม
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
