import { Link, useParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useGoodsReceipt } from '../hooks/useGoodsReceipt'
import { GRNDetailHeader } from '../components/GRNDetailHeader'
import { GRNItemsTable } from '../components/GRNItemsTable'

// PO analog PODetailPage; GRN is immutable (contract §7) so this drops all
// mutation/action state, ConfirmDialog, useCurrentUser and toast.
export function GRNDetailPage() {
  const { id } = useParams()
  const grnId = Number(id)
  const validId = Number.isInteger(grnId) && grnId > 0

  const { data: grn, isLoading, isError } = useGoodsReceipt(validId ? grnId : 0)

  if (!validId || isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>ไม่พบใบรับของนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</AlertTitle>
        <AlertDescription>
          <Link to="/goods-receipts" className="underline">
            กลับไปรายการ
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || !grn) {
    return (
      <div data-testid="grn-detail-loading" className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  return (
    <div>
      <GRNDetailHeader grn={grn} />
      <GRNItemsTable items={grn.items} />
    </div>
  )
}
