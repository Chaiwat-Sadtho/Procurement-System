import { useForm, useWatch } from 'react-hook-form'
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
import { ROLE_OPTIONS } from '../lib/roleLabels'
import { DEFAULT_USER_FILTERS, type StatusFilter, type UserFilterValues } from '../lib/userFilters'

const filterSchema = z.object({
  search: z.string(),
  role: z.string(),
  status: z.enum(['all', 'active', 'inactive']),
})

const ROLE_FILTER_OPTIONS = [{ value: 'all', label: 'ทั้งหมด' }, ...ROLE_OPTIONS]

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'active', label: 'ใช้งาน' },
  { value: 'inactive', label: 'ปิดใช้งาน' },
]

interface UserListFilterFormProps {
  onSubmit: (values: UserFilterValues) => void
  onClear?: () => void
  canClear?: boolean
}

export function UserListFilterForm({ onSubmit, onClear, canClear }: UserListFilterFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { isDirty },
  } = useForm<UserFilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: DEFAULT_USER_FILTERS,
  })

  const role = useWatch({ control, name: 'role' })
  const status = useWatch({ control, name: 'status' })

  function handleClear() {
    reset(DEFAULT_USER_FILTERS)
    onClear?.()
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="user-search">ค้นหา</Label>
          <Input id="user-search" placeholder="ชื่อ หรือ อีเมล" {...register('search')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="user-role">บทบาท</Label>
          <Select value={role ?? 'all'} onValueChange={(v) => setValue('role', v, { shouldDirty: true })}>
            <SelectTrigger id="user-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="user-status">สถานะ</Label>
          <Select
            value={status ?? 'all'}
            onValueChange={(v) => setValue('status', v as StatusFilter, { shouldDirty: true })}
          >
            <SelectTrigger id="user-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
