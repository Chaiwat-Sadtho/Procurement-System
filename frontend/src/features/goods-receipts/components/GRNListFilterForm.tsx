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
import type { ReceivablePO } from '../types'

const filterSchema = z.object({
  status: z.string().optional(), // 'all' | <GrnStatus>
  poId: z.string().optional(), // 'all' | '<id>'
})

export type GRNListFilterValues = z.infer<typeof filterSchema>

const STATUS_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'partial', label: 'รับไม่ครบ' },
  { value: 'complete', label: 'รับครบถ้วน' },
]

interface GRNListFilterFormProps {
  pos: ReceivablePO[]
  /** seeds RHF defaultValues; consumed once at mount — remount via `key` to change after mount */
  initialValues?: GRNListFilterValues
  onSubmit: (values: GRNListFilterValues) => void
  onClear?: () => void
  canClear?: boolean
}

export function GRNListFilterForm({
  pos,
  initialValues,
  onSubmit,
  onClear,
  canClear,
}: GRNListFilterFormProps) {
  const defaultValues: GRNListFilterValues = initialValues ?? {
    status: 'all',
    poId: 'all',
  }

  const {
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { isDirty },
  } = useForm<GRNListFilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues,
  })

  const status = useWatch({ control, name: 'status' })
  const poId = useWatch({ control, name: 'poId' })

  const poOptions = [
    { value: 'all', label: 'ทุกใบสั่งซื้อ' },
    ...pos.map((p) => ({ value: String(p.id), label: p.poNumber })),
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
          <Label htmlFor="poId">ใบสั่งซื้อ (PO)</Label>
          <Combobox
            id="poId"
            value={poId ?? 'all'}
            onChange={(v) => setValue('poId', v, { shouldDirty: true })}
            options={poOptions}
            placeholder="ทุกใบสั่งซื้อ"
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
