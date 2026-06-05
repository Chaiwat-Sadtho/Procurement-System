import { useState } from 'react'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
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
import { useUsers } from '../hooks/useUsers'
import { filterUsers, DEFAULT_USER_FILTERS, type UserFilterValues } from '../lib/userFilters'
import { UserListFilterForm } from '../components/UserListFilterForm'
import { UserRoleSelect } from '../components/UserRoleSelect'
import { UserStatusToggle } from '../components/UserStatusToggle'

const SELF_HINT = 'แก้ไขบัญชีตัวเองไม่ได้'
const LAST_PO_HINT = 'ต้องมีเจ้าหน้าที่จัดซื้อที่ใช้งานอย่างน้อย 1 คน'

export function UsersPage() {
  const { data: users, isLoading, isError, refetch } = useUsers()
  const { data: currentUser } = useCurrentUser()
  const [filters, setFilters] = useState<UserFilterValues>(DEFAULT_USER_FILTERS)

  // global count: this page is PO-only, so GET /users returns everyone and the
  // active-PO count is always correct (manager dept-scoping never applies here, spec §7)
  const activePoCount = (users ?? []).filter(
    (u) => u.role === 'procurement_officer' && u.isActive,
  ).length

  const rows = users ? filterUsers(users, filters) : []

  return (
    <div>
      <PageHeader title="ผู้ใช้งาน" description="จัดการบทบาทและสถานะผู้ใช้งาน" />

      <UserListFilterForm
        values={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_USER_FILTERS)}
      />

      {isError ? (
        <ListErrorState message="โหลดข้อมูลผู้ใช้งานไม่สำเร็จ" onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListLoadingState testId="users-loading" />
      ) : (
        <>
          <div className="rounded-md border">
            <Table className="table-fixed min-w-[820px]">
              <TableHeader className="bg-table-header text-table-header-foreground">
                <TableRow>
                  <TableHead className="w-14 text-center">ลำดับ</TableHead>
                  <TableHead className="min-w-[220px]">ผู้ใช้งาน</TableHead>
                  <TableHead className="w-[160px]">แผนก</TableHead>
                  <TableHead className="w-[200px]">บทบาท</TableHead>
                  <TableHead className="w-[140px]">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <ListEmptyRow colSpan={5} />
                ) : (
                  rows.map((u, i) => {
                    const isOwnRow = currentUser?.id === u.id
                    const isLastActivePo =
                      u.role === 'procurement_officer' && u.isActive && activePoCount <= 1
                    const disabled = isOwnRow || isLastActivePo
                    const reason = isOwnRow ? SELF_HINT : isLastActivePo ? LAST_PO_HINT : undefined
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="text-center tabular-nums">{i + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium truncate">{u.fullName.trim() || u.email}</div>
                          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        </TableCell>
                        <TableCell className="truncate">{u.department?.name ?? '—'}</TableCell>
                        <TableCell>
                          <UserRoleSelect user={u} disabled={disabled} disabledReason={reason} />
                        </TableCell>
                        <TableCell>
                          <UserStatusToggle user={u} disabled={disabled} disabledReason={reason} />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {rows.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              ทั้งหมด {rows.length} คน
            </p>
          )}
        </>
      )}
    </div>
  )
}
