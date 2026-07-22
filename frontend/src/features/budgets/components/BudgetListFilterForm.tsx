import { useState } from 'react'
import { ActionButtons } from '@/shared/components/ActionButtons'
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
  /** seeds the year + dept inputs from the URL; consumed once at mount — remount via key to change */
  initialValues?: BudgetListFilterResult
  // managers get their own department pre-filled and disabled (the backend re-checks anyway)
  lockedDepartmentId?: number | null
  onSubmit: (result: BudgetListFilterResult) => void
  onClear?: () => void
  canClear?: boolean
}

export function BudgetListFilterForm({
  departments,
  defaultFiscalYear,
  initialValues,
  lockedDepartmentId,
  onSubmit,
  onClear,
  canClear,
}: BudgetListFilterFormProps) {
  const isLocked = lockedDepartmentId != null
  const initialYear = String(initialValues?.fiscalYear ?? defaultFiscalYear)
  // manager lock wins over any URL value; else restore from initialValues, else 'all'
  const initialDept = isLocked
    ? String(lockedDepartmentId)
    : initialValues?.departmentId != null
      ? String(initialValues.departmentId)
      : 'all'
  const [year, setYear] = useState(initialYear)
  const [deptValue, setDeptValue] = useState<string>(initialDept)
  const isDirty = year !== initialYear || deptValue !== initialDept

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

  function handleClear() {
    setYear(String(defaultFiscalYear))
    setDeptValue(isLocked ? String(lockedDepartmentId) : 'all')
    onClear?.()
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
