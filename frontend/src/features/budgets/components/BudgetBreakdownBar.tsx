import { formatCurrency } from '@/shared/lib/utils'

interface BudgetBreakdownBarProps {
  total: number
  reserved: number
  used: number
  usagePercent: number
}

// stacked bar: จองแล้ว=ส้ม / ใช้จริง=ฟ้า / คงเหลือ=เขียว (สี category ตาม design spec §4.2)
export function BudgetBreakdownBar({ total, reserved, used, usagePercent }: BudgetBreakdownBarProps) {
  const safeTotal = total > 0 ? total : 1
  const remaining = Math.max(0, total - reserved - used)
  const pct = (v: number) => `${Math.min(100, (v / safeTotal) * 100)}%`

  return (
    <div className="space-y-2">
      <div
        className="flex h-4 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`ใช้ไปแล้ว ${usagePercent}% ของงบ`}
      >
        <div className="bg-amber-500" style={{ width: pct(reserved) }} />
        <div className="bg-blue-500" style={{ width: pct(used) }} />
        <div className="bg-emerald-500" style={{ width: pct(remaining) }} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <LegendDot className="bg-amber-500" label="จองแล้ว" value={reserved} />
        <LegendDot className="bg-blue-500" label="ใช้จริง" value={used} />
        <LegendDot className="bg-emerald-500" label="คงเหลือ" value={remaining} />
      </div>
      <p className="text-sm text-muted-foreground">ใช้ไปแล้ว {usagePercent}% ของงบ</p>
    </div>
  )
}

function LegendDot({ className, label, value }: { className: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm ${className}`} aria-hidden="true" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{formatCurrency(value)}</span>
    </span>
  )
}
