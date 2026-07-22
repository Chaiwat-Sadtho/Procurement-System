import { useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ActionButtons } from '@/shared/components/ActionButtons'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { DateField } from '@/shared/components/DateField'
import { RequiredMark } from '@/shared/components/RequiredMark'
import { dateToIso } from '@/shared/lib/buddhistDate'

const filterSchema = z
  .object({
    prNumber: z.string().optional(),
    search: z.string().optional(),
    from: z.string().min(1, 'กรุณาเลือกวันที่เริ่มต้น'),
    to: z.string().min(1, 'กรุณาเลือกวันที่สิ้นสุด'),
    requesterName: z.string().optional(),
    status: z.string().optional(),
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, {
    message: 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด',
    path: ['to'],
  })

export type PRListFilterValues = z.infer<typeof filterSchema>

const STATUS_OPTIONS = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'draft', label: 'ฉบับร่าง' },
  { value: 'submitted', label: 'รออนุมัติ' },
  { value: 'approved', label: 'อนุมัติแล้ว' },
  { value: 'rejected', label: 'ไม่อนุมัติ' },
]

interface PRListFilterFormProps {
  showRequester: boolean
  /** seeds RHF defaultValues; consumed once at mount — remount via `key` to change after mount */
  initialValues?: PRListFilterValues
  onSubmit: (values: PRListFilterValues) => void
  onClear?: () => void
  canClear?: boolean
}

const EMPTY_FILTERS: PRListFilterValues = {
  prNumber: '',
  search: '',
  from: '',
  to: '',
  requesterName: '',
  status: 'all',
}

export function PRListFilterForm({
  showRequester,
  initialValues,
  onSubmit,
  onClear,
  canClear,
}: PRListFilterFormProps) {
  const [resetKey, setResetKey] = useState(0)

  // Values restored from the URL win; a fresh form defaults the end date to today
  const defaultValues: PRListFilterValues = initialValues ?? {
    ...EMPTY_FILTERS,
    to: dateToIso(new Date()),
  }

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PRListFilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues,
  })

  const statusValue = useWatch({ control, name: 'status' }) ?? 'all'

  function handleClear() {
    // Clearing empties every field, including the end date — the page remount re-seeds today's date
    reset(EMPTY_FILTERS)
    setResetKey((k) => k + 1) // remount DateField to drop any half-typed text
    onClear?.()
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4 mb-4">
      {/* Row 1: PR Number / Title / Date from / Date to */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label htmlFor="prNumber">เลขที่ PR</Label>
          <Input id="prNumber" placeholder="PR-2026-0001" {...register('prNumber')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="search">ชื่อรายการ</Label>
          <Input id="search" placeholder="ค้นหาในชื่อ PR" {...register('search')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="from">
            วันที่เริ่มต้น
            <RequiredMark />
          </Label>
          <Controller
            name="from"
            control={control}
            render={({ field }) => (
              <DateField
                key={`from-${resetKey}`}
                id="from"
                value={field.value}
                onChange={field.onChange}
                error={errors.from?.message}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="to">
            วันที่สิ้นสุด
            <RequiredMark />
          </Label>
          <Controller
            name="to"
            control={control}
            render={({ field }) => (
              <DateField
                key={`to-${resetKey}`}
                id="to"
                value={field.value}
                onChange={field.onChange}
                error={errors.to?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Row 2: Requester (เฉพาะ showRequester) / Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {showRequester && (
          <div className="space-y-1">
            <Label htmlFor="requesterName">ผู้ขอ</Label>
            <Input
              id="requesterName"
              placeholder="ค้นหาด้วยชื่อผู้ขอ"
              {...register('requesterName')}
            />
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="status">สถานะ</Label>
          <Select
            value={statusValue}
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
      </div>

      {/* Row 3: ค้นหา + ล้าง (right-aligned cluster ผ่าน ActionButtons; mobile stack เต็มกว้าง) */}
      <ActionButtons
        buttons={[
          { key: 'search', label: 'ค้นหา', type: 'submit' },
          {
            key: 'clear',
            label: 'ล้าง',
            type: 'button',
            variant: 'destructive',
            disabled: !isDirty && !canClear,
            onClick: handleClear,
          },
        ]}
      />
    </form>
  )
}
