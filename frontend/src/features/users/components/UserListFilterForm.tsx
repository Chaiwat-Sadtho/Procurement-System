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

const ROLE_FILTER_OPTIONS = [{ value: 'all', label: 'ทั้งหมด' }, ...ROLE_OPTIONS]

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'active', label: 'ใช้งาน' },
  { value: 'inactive', label: 'ปิดใช้งาน' },
]

interface UserListFilterFormProps {
  values: UserFilterValues
  onChange: (values: UserFilterValues) => void
  onClear: () => void
}

export function UserListFilterForm({ values, onChange, onClear }: UserListFilterFormProps) {
  const isDefault =
    values.search === DEFAULT_USER_FILTERS.search &&
    values.role === DEFAULT_USER_FILTERS.role &&
    values.status === DEFAULT_USER_FILTERS.status

  return (
    <div className="space-y-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="user-search">ค้นหา</Label>
          <Input
            id="user-search"
            placeholder="ชื่อ หรือ อีเมล"
            value={values.search}
            onChange={(e) => onChange({ ...values, search: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="user-role">บทบาท</Label>
          <Select value={values.role} onValueChange={(v) => onChange({ ...values, role: v })}>
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
            value={values.status}
            onValueChange={(v) => onChange({ ...values, status: v as StatusFilter })}
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
        <Button
          type="button"
          variant="destructive"
          className="w-full md:col-start-4"
          disabled={isDefault}
          onClick={onClear}
        >
          ล้าง
        </Button>
      </div>
    </div>
  )
}
