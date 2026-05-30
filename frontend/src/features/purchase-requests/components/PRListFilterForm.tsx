import { useForm } from 'react-hook-form'
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
import { RequiredMark } from '@/shared/components/RequiredMark'
import { useUsers } from '@/features/users/hooks/useUsers'

const filterSchema = z
  .object({
    prNumber: z.string().optional(),
    search: z.string().optional(),
    from: z.string().min(1, 'กรุณาเลือกวันที่เริ่มต้น'),
    to: z.string().min(1, 'กรุณาเลือกวันที่สิ้นสุด'),
    requesterId: z.string().optional(),
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
}

export function PRListFilterForm({ showRequester, onSubmit }: PRListFilterFormProps) {
  const { data: users } = useUsers({ enabled: showRequester })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PRListFilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      prNumber: '',
      search: '',
      from: '',
      to: '',
      requesterId: 'all',
      status: 'all',
    },
  })

  const requesterValue = watch('requesterId') ?? 'all'
  const statusValue = watch('status') ?? 'all'

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
          <Input id="from" type="date" {...register('from')} />
          {errors.from && <p className="text-sm text-destructive">{errors.from.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="to">
            วันที่สิ้นสุด<RequiredMark />
          </Label>
          <Input id="to" type="date" {...register('to')} />
          {errors.to && <p className="text-sm text-destructive">{errors.to.message}</p>}
        </div>
      </div>

      {/* Row 2: Requester (เฉพาะ showRequester) / Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {showRequester && (
          <div className="space-y-1">
            <Label htmlFor="requesterId">ผู้ขอ</Label>
            <Select
              value={requesterValue}
              onValueChange={(v) => setValue('requesterId', v)}
            >
              <SelectTrigger id="requesterId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="status">สถานะ</Label>
          <Select value={statusValue} onValueChange={(v) => setValue('status', v)}>
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

      {/* Row 3: submit */}
      <div className="flex justify-end">
        <Button type="submit">ค้นหา</Button>
      </div>
    </form>
  )
}
