import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/shared/components/ui/button'
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
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

interface PRListFilterFormProps {
  showRequester: boolean
  onSubmit: (values: PRListFilterValues) => void
  onClear?: () => void
}

export function PRListFilterForm({ showRequester, onSubmit, onClear }: PRListFilterFormProps) {
  const [resetKey, setResetKey] = useState(0)

  const defaultValues: PRListFilterValues = {
    prNumber: '',
    search: '',
    from: '',
    to: dateToIso(new Date()), // วันสิ้นสุด default = วันนี้ (#6)
    requesterName: '',
    status: 'all',
  }

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<PRListFilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues,
  })

  const statusValue = watch('status') ?? 'all'

  function handleClear() {
    reset(defaultValues)
    setResetKey((k) => k + 1) // remount DateField → ล้าง buffer ที่พิมพ์ค้าง
    onClear?.()
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4 mb-4">
      {/* Row 1: PR Number / Title / Date from / Date to */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label htmlFor="prNumber">PR Number</Label>
          <Input id="prNumber" placeholder="PR-2026-0001" {...register('prNumber')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="search">Title</Label>
          <Input id="search" placeholder="ค้นหาในชื่อ PR" {...register('search')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="from">
            วันที่เริ่มต้น<RequiredMark />
          </Label>
          <Controller
            name="from"
            control={control}
            render={({ field }) => (
              <DateField key={`from-${resetKey}`} id="from" value={field.value} onChange={field.onChange} />
            )}
          />
          <p className="text-sm text-destructive min-h-[1.25rem]">{errors.from?.message}</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="to">
            วันที่สิ้นสุด<RequiredMark />
          </Label>
          <Controller
            name="to"
            control={control}
            render={({ field }) => (
              <DateField key={`to-${resetKey}`} id="to" value={field.value} onChange={field.onChange} />
            )}
          />
          <p className="text-sm text-destructive min-h-[1.25rem]">{errors.to?.message}</p>
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
          <Select value={statusValue} onValueChange={(v) => setValue('status', v, { shouldDirty: true })}>
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

      {/* Row 3: ล้าง + ค้นหา (grid 4-col ชิดขวา; desktop ปุ่มละ ~1/4, mobile stack เต็มกว้าง) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Button
          type="button"
          variant="destructive"
          className="w-full md:col-start-3"
          disabled={!isDirty}
          onClick={handleClear}
        >
          ล้าง
        </Button>
        <Button type="submit" className="w-full md:col-start-4">
          ค้นหา
        </Button>
      </div>
    </form>
  )
}
