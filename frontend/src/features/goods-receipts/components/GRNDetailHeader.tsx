import type * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { formatDate } from '@/shared/lib/utils'
import { GrnStatusBadge } from './GrnStatusBadge'
import type { GoodsReceipt } from '../types'

interface GRNDetailHeaderProps {
  grn: GoodsReceipt
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

// Detail header (PO analog PODetailHeader; drops actions + total — GRN is immutable, no money).
export function GRNDetailHeader({ grn }: GRNDetailHeaderProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <Link
          to="/goods-receipts"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> กลับไปรายการ
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">{grn.grnNumber}</span>
              <GrnStatusBadge status={grn.status} />
            </div>
            <h1 className="mt-1 text-2xl font-semibold">การรับของ</h1>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <MetaItem
            label="ใบสั่งซื้อ (PO)"
            value={
              <Link
                to={`/purchase-orders/${grn.poId}`}
                className="font-mono text-primary hover:underline"
              >
                {grn.purchaseOrder?.poNumber ?? `#${grn.poId}`}
              </Link>
            }
          />
          <MetaItem label="วันที่รับ" value={formatDate(grn.receivedDate)} />
          <MetaItem label="ผู้รับ" value={grn.receivedByUser?.fullName ?? '-'} />
        </dl>

        {grn.notes && <p className="mt-4 text-sm text-muted-foreground">{grn.notes}</p>}
      </CardContent>
    </Card>
  )
}
