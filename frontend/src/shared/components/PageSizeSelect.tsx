import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { PAGE_SIZE_OPTIONS } from '@/shared/hooks/usePagination'
import { cn } from '@/shared/lib/utils'

interface PageSizeSelectProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export function PageSizeSelect({ value, onChange, className }: PageSizeSelectProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <span>แสดง</span>
      {/* Radix onValueChange returns a string -> convert to number before emitting */}
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger aria-label="จำนวนแถวต่อหน้า" className="h-9 w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={String(opt)}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>แถว/หน้า</span>
    </div>
  )
}
