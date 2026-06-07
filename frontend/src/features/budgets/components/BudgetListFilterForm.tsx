import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Combobox } from '@/shared/components/Combobox'
import type { DashboardDepartment } from '@/features/dashboard/api'

export interface BudgetListFilterResult {
  fiscalYear: number
  departmentId?: number
}

interface BudgetListFilterFormProps {
  departments: DashboardDepartment[]
  defaultFiscalYear: number
  // manager: ล็อกแผนกตัวเอง (disabled + prefill) — BE enforce ซ้ำ (defense in depth)
  lockedDepartmentId?: number | null
  onSubmit: (result: BudgetListFilterResult) => void
}

export function BudgetListFilterForm({
  departments,
  defaultFiscalYear,
  lockedDepartmentId,
  onSubmit,
}: BudgetListFilterFormProps) {
  const isLocked = lockedDepartmentId != null
  const [year, setYear] = useState(String(defaultFiscalYear))
  const [deptValue, setDeptValue] = useState<string>(isLocked ? String(lockedDepartmentId) : 'all')

  const deptOptions = [
    { value: 'all', label: 'ทุกแผนก' },
    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
  ]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fiscalYear = Number(year)
    if (!Number.isInteger(fiscalYear) || fiscalYear < 2020 || fiscalYear > 2100) return
    const departmentId = deptValue !== 'all' ? Number(deptValue) : undefined
    onSubmit({ fiscalYear, departmentId })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="budget-year">ปีงบประมาณ</Label>
          <Input
            id="budget-year"
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="เช่น 2026"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="budget-dept">แผนก</Label>
          <Combobox
            id="budget-dept"
            value={deptValue}
            onChange={setDeptValue}
            options={deptOptions}
            placeholder="ทุกแผนก"
            disabled={isLocked}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Button type="submit" className="w-full md:col-start-4">
          ค้นหา
        </Button>
      </div>
    </form>
  )
}
