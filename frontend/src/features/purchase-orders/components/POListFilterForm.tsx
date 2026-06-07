import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Combobox } from '@/shared/components/Combobox'
import type { Vendor } from '@/features/vendors/types'

const filterSchema = z.object({
  status: z.string().optional(), // 'all' | <PoStatus>
  vendorId: z.string().optional(), // 'all' | '<id>'
})

export type POListFilterValues = z.infer<typeof filterSchema>

const STATUS_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'draft', label: 'ฉบับร่าง' },
  { value: 'sent', label: 'ส่งแล้ว' },
  { value: 'acknowledged', label: 'รับทราบแล้ว' },
  { value: 'partially_received', label: 'รับบางส่วน' },
  { value: 'completed', label: 'เสร็จสมบูรณ์' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

interface POListFilterFormProps {
  vendors: Vendor[]
  onSubmit: (values: POListFilterValues) => void
  onClear?: () => void
  canClear?: boolean
}

export function POListFilterForm({ vendors, onSubmit, onClear, canClear }: POListFilterFormProps) {
  const defaultValues: POListFilterValues = {
    status: 'all',
    vendorId: 'all',
  }

  const {
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { isDirty },
  } = useForm<POListFilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues,
  })

  const status = useWatch({ control, name: 'status' })
  const vendorId = useWatch({ control, name: 'vendorId' })

  const vendorOptions = [
    { value: 'all', label: 'ทุกผู้ขาย' },
    ...vendors.map((v) => ({ value: String(v.id), label: v.name })),
  ]

  function handleClear() {
    reset(defaultValues)
    onClear?.()
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="status">สถานะ</Label>
          <Select
            value={status ?? 'all'}
            onValueChange={(v) => setValue('status', v, { shouldDirty: true })}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="vendorId">ผู้ขาย</Label>
          <Combobox
            id="vendorId"
            value={vendorId ?? 'all'}
            onChange={(v) => setValue('vendorId', v, { shouldDirty: true })}
            options={vendorOptions}
            placeholder="ทุกผู้ขาย"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Button type="submit" className="w-full md:col-start-3">
          ค้นหา
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="w-full md:col-start-4"
          disabled={!isDirty && !canClear}
          onClick={handleClear}
        >
          ล้าง
        </Button>
      </div>
    </form>
  )
}
