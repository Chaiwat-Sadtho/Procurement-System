import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { Badge } from '@/shared/components/ui/badge'
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
import { ListPaginationFooter } from '@/shared/components/ListPaginationFooter'
import { usePagination } from '@/shared/hooks/usePagination'
import { getRowIndex } from '@/shared/lib/utils'
import { VendorBlacklistBadge } from '../components/VendorBlacklistBadge'
import {
  VendorListFilterForm,
  type VendorListFilterValues,
} from '../components/VendorListFilterForm'
import { useVendors } from '../hooks/useVendors'
import { useVendorCategories } from '../hooks/useVendorCategories'
import { formatRating, toCategoryIdParam, toIsBlacklistedParam } from '../lib/vendorFilters'

const DEFAULT_FILTERS: VendorListFilterValues = {
  search: '',
  isBlacklisted: 'all',
  categoryId: 'all',
}

export function VendorListPage() {
  const navigate = useNavigate()
  const { page, limit, setPage, nextPage, prevPage, setLimit } = usePagination()
  const [filters, setFilters] = useState<VendorListFilterValues>(DEFAULT_FILTERS)

  const { data: categories } = useVendorCategories()
  const { data: user } = useCurrentUser()
  const canCreate = user?.role === 'procurement_officer'

  const queryParams = {
    page,
    limit,
    search: filters.search?.trim() || undefined,
    isBlacklisted: toIsBlacklistedParam(filters.isBlacklisted),
    categoryId: toCategoryIdParam(filters.categoryId),
  }

  const { data, isLoading, isError, refetch } = useVendors(queryParams, { enabled: true })

  // running number sticks to the page the server actually returned (meta),
  // not the local page state which momentarily leads the fetch
  const displayPage = data?.meta.page ?? page
  const displayLimit = data?.meta.limit ?? limit

  const handleSubmit = (values: VendorListFilterValues) => {
    setPage(1)
    setFilters(values)
  }

  const handleClear = () => {
    setPage(1)
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div>
      <PageHeader
        title="ผู้ขาย"
        description="ค้นหาและเรียกดูรายชื่อผู้ขาย"
        action={
          canCreate ? (
            <Button onClick={() => navigate('/vendors/new')}>เพิ่มผู้ขาย</Button>
          ) : undefined
        }
      />

      <VendorListFilterForm
        categories={categories ?? []}
        onSubmit={handleSubmit}
        onClear={handleClear}
      />

      {isError ? (
        <ListErrorState message="โหลดข้อมูลผู้ขายไม่สำเร็จ" onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListLoadingState testId="vendor-list-loading" />
      ) : (
        <>
          <div className="rounded-md border">
            <Table className="table-fixed min-w-[1100px]">
              <TableHeader className="bg-table-header text-table-header-foreground">
                <TableRow>
                  <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                  <TableHead className="min-w-[220px]">ชื่อผู้ขาย</TableHead>
                  <TableHead className="w-[150px]">เลขผู้เสียภาษี</TableHead>
                  <TableHead className="min-w-[180px]">หมวดหมู่</TableHead>
                  <TableHead className="w-[200px]">ติดต่อ</TableHead>
                  <TableHead className="w-[130px]">สถานะ</TableHead>
                  <TableHead className="w-[90px] text-right">คะแนน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.data.length === 0 ? (
                  <ListEmptyRow colSpan={7} />
                ) : (
                  data.data.map((v, i) => (
                    <TableRow
                      key={v.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => navigate(`/vendors/${v.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/vendors/${v.id}`)
                        }
                      }}
                      className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <TableCell className="text-center">
                        {getRowIndex(displayPage, displayLimit, i)}
                      </TableCell>
                      <TableCell className="font-medium truncate">{v.name}</TableCell>
                      <TableCell className="font-mono tabular-nums">{v.taxId ?? '—'}</TableCell>
                      <TableCell>
                        {v.categories.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {v.categories.slice(0, 2).map((c) => (
                              <Badge key={c.id} variant="secondary">
                                {c.name}
                              </Badge>
                            ))}
                            {v.categories.length > 2 && <Badge variant="secondary">…</Badge>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="truncate">{v.email ?? '—'}</div>
                        <div className="text-muted-foreground truncate">{v.phone ?? '—'}</div>
                      </TableCell>
                      <TableCell>
                        <VendorBlacklistBadge isBlacklisted={v.isBlacklisted} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatRating(v.ratingAvg)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.meta.total > 0 && (
            <ListPaginationFooter
              summary={`หน้า ${data.meta.page} จาก ${data.meta.totalPages} (${data.meta.total} รายการ)`}
              page={page}
              totalPages={data.meta.totalPages}
              limit={limit}
              onPrev={prevPage}
              onNext={nextPage}
              onLimitChange={setLimit}
            />
          )}
        </>
      )}
    </div>
  )
}
