import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { PageHeader } from '@/shared/components/PageHeader'
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
  const { page, limit, setPage, nextPage, prevPage } = usePagination()
  const [filters, setFilters] = useState<VendorListFilterValues>(DEFAULT_FILTERS)

  const { data: categories } = useVendorCategories()

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
      <PageHeader title="ผู้ขาย" description="ค้นหาและเรียกดูรายชื่อผู้ขาย" />

      <VendorListFilterForm
        categories={categories ?? []}
        onSubmit={handleSubmit}
        onClear={handleClear}
      />

      {isError ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">โหลดข้อมูลผู้ขายไม่สำเร็จ</p>
          <Button variant="outline" onClick={() => refetch()}>
            ลองใหม่
          </Button>
        </div>
      ) : isLoading ? (
        <div data-testid="vendor-list-loading" className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
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
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลตามเงื่อนไข
                    </TableCell>
                  </TableRow>
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

          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                หน้า {data.meta.page} จาก {data.meta.totalPages} ({data.meta.total} รายการ)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prevPage} disabled={page <= 1}>
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={page >= data.meta.totalPages}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
