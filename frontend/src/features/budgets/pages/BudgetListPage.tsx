import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useDepartments } from '@/features/dashboard/hooks/useDepartments'
import { Button } from '@/shared/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { PageHeader } from '@/shared/components/PageHeader'
import { ListLoadingState } from '@/shared/components/ListLoadingState'
import { ListErrorState } from '@/shared/components/ListErrorState'
import { ListEmptyRow } from '@/shared/components/ListEmptyRow'
import { ListSearchPrompt } from '@/shared/components/ListSearchPrompt'
import { RowLink } from '@/shared/components/RowLink'
import { formatCurrency } from '@/shared/lib/utils'
import { BudgetListFilterForm, type BudgetListFilterResult } from '../components/BudgetListFilterForm'
import { useBudgets } from '../hooks/useBudgets'
import { useUrlFilters } from '@/shared/hooks/useUrlFilters'
import { budgetUrlFilterConfig } from '../lib/budgetUrlFilters'
import type { BudgetListParams } from '../types'

function periodLabel(fiscalYear: number, quarter: number | null): string {
  return quarter == null ? `${fiscalYear} รายปี` : `${fiscalYear} Q${quarter}`
}

export function BudgetListPage() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: departments } = useDepartments()
  const isManager = user?.role === 'manager'
  const canCreate = user?.role === 'procurement_officer'

  // search-first + filters-in-URL (มิเรอร์ group A): filters/q อยู่ใน URL (survive refresh); query ยิงเมื่อ hasSearched
  const { filters, hasSearched, signature, commit, clear } = useUrlFilters(budgetUrlFilterConfig)
  // manager: บังคับแผนกตัวเอง แม้ URL ถูกปั้นเป็นแผนกอื่น (BE enforce ซ้ำ — defense in depth)
  const appliedParams: BudgetListParams = {
    fiscalYear: filters.fiscalYear,
    departmentId: isManager ? (user?.departmentId ?? undefined) : filters.departmentId,
  }
  const { data, isLoading, isError, refetch } = useBudgets(appliedParams, { enabled: hasSearched })

  function handleSubmit(result: BudgetListFilterResult) {
    // manager: บังคับแผนกตัวเอง (BE enforce ซ้ำ)
    const departmentId = isManager ? (user?.departmentId ?? undefined) : result.departmentId
    commit({ fiscalYear: result.fiscalYear, departmentId })
  }

  function handleClear() {
    clear()
  }

  // เรียง remaining น้อย→มาก (ใกล้หมดขึ้นก่อน); remaining = total - reserved - used (FE คำนวณ)
  const rows = useMemo(() => {
    if (!data) return []
    return [...data]
      .map((b) => ({ ...b, remaining: b.totalAmount - b.reservedAmount - b.usedAmount }))
      .sort((a, b) => a.remaining - b.remaining)
  }, [data])

  return (
    <div>
      <PageHeader
        title="งบประมาณ"
        description="ค้นหาและเรียกดูงบประมาณรายแผนก/ปี/ไตรมาส"
        action={
          canCreate ? (
            <Button onClick={() => navigate('/budgets/new')}>สร้างงบประมาณ</Button>
          ) : undefined
        }
      />

      <BudgetListFilterForm
        key={signature}
        departments={departments ?? []}
        defaultFiscalYear={new Date().getFullYear()}
        initialValues={filters}
        lockedDepartmentId={isManager ? user?.departmentId : null}
        onSubmit={handleSubmit}
        onClear={handleClear}
        canClear={hasSearched}
      />

      {!hasSearched ? (
        <ListSearchPrompt message="เลือกปีงบประมาณ/แผนก แล้วกดค้นหา" />
      ) : isError ? (
        <ListErrorState message="โหลดข้อมูลงบประมาณไม่สำเร็จ" onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListLoadingState testId="budget-list-loading" />
      ) : (
        <div className="rounded-md border">
          <Table className="table-fixed min-w-[900px]">
            <TableHeader className="bg-table-header text-table-header-foreground">
              <TableRow>
                <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                <TableHead className="min-w-[180px]">แผนก</TableHead>
                <TableHead className="w-[140px]">งวด</TableHead>
                <TableHead className="w-[150px] text-right">งบทั้งหมด</TableHead>
                <TableHead className="w-[150px] text-right">จองแล้ว</TableHead>
                <TableHead className="w-[150px] text-right">ใช้จริง</TableHead>
                <TableHead className="w-[150px] text-right">คงเหลือ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <ListEmptyRow colSpan={7} message="ไม่พบงบประมาณตามเงื่อนไข" />
              ) : (
                rows.map((b, i) => (
                  <TableRow
                    key={b.id}
                    onClick={() => navigate(`/budgets/${b.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="text-center">{i + 1}</TableCell>
                    <TableCell className="font-medium truncate">
                      <RowLink to={`/budgets/${b.id}`}>{b.department?.name ?? '—'}</RowLink>
                    </TableCell>
                    <TableCell>{periodLabel(b.fiscalYear, b.quarter)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(b.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                      {formatCurrency(b.reservedAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-blue-600 dark:text-blue-400">
                      {formatCurrency(b.usedAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(b.remaining)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
