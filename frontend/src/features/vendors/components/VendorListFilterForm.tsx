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
import { Combobox } from '@/shared/components/Combobox'
import type { VendorCategory } from '../types'

const filterSchema = z.object({
  search: z.string().optional(),
  isBlacklisted: z.string().optional(), // 'all' | 'true' | 'false'
  categoryId: z.string().optional(), // 'all' | '<id>'
})

export type VendorListFilterValues = z.infer<typeof filterSchema>

const STATUS_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'false', label: 'ปกติ' },
  { value: 'true', label: 'แบล็คลิสต์' },
]

interface VendorListFilterFormProps {
  categories: VendorCategory[]
  onSubmit: (values: VendorListFilterValues) => void
  onClear?: () => void
}

export function VendorListFilterForm({ categories, onSubmit, onClear }: VendorListFilterFormProps) {
  const defaultValues: VendorListFilterValues = {
    search: '',
    isBlacklisted: 'all',
    categoryId: 'all',
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { isDirty },
  } = useForm<VendorListFilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues,
  })

  const isBlacklisted = useWatch({ control, name: 'isBlacklisted' })
  const categoryId = useWatch({ control, name: 'categoryId' })

  const categoryOptions = [
    { value: 'all', label: 'ทุกหมวดหมู่' },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ]

  function handleClear() {
    reset(defaultValues)
    onClear?.()
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="search">ชื่อผู้ขาย</Label>
          <Input id="search" placeholder="ค้นหาด้วยชื่อผู้ขาย" {...register('search')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="isBlacklisted">สถานะ</Label>
          <Select
            value={isBlacklisted ?? 'all'}
            onValueChange={(v) => setValue('isBlacklisted', v, { shouldDirty: true })}
          >
            <SelectTrigger id="isBlacklisted">
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
          <Label htmlFor="categoryId">หมวดหมู่</Label>
          <Combobox
            id="categoryId"
            value={categoryId ?? 'all'}
            onChange={(v) => setValue('categoryId', v, { shouldDirty: true })}
            options={categoryOptions}
            placeholder="ทุกหมวดหมู่"
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
          disabled={!isDirty}
          onClick={handleClear}
        >
          ล้าง
        </Button>
      </div>
    </form>
  )
}
