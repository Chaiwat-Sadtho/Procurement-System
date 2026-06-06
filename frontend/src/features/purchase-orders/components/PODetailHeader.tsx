import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import { POStatusBadge } from './POStatusBadge'
import type { PurchaseOrder } from '../types'

interface PODetailHeaderProps {
  po: PurchaseOrder
  actions?: React.ReactNode
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

export function PODetailHeader({ po, actions }: PODetailHeaderProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <Link
          to="/purchase-orders"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> กลับไปรายการ
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">{po.poNumber}</span>
              <POStatusBadge status={po.status} />
            </div>
            <h1 className="mt-1 text-2xl font-semibold">{po.vendor?.name ?? '-'}</h1>
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <MetaItem
            label="คำขอซื้อ (PR)"
            value={
              po.purchaseRequest ? (
                <Link
                  to={`/purchase-requests/${po.prId}`}
                  className="font-mono text-primary hover:underline"
                >
                  {po.purchaseRequest.prNumber}
                </Link>
              ) : (
                '-'
              )
            }
          />
          <MetaItem
            label="ผู้ขาย"
            value={
              po.vendor ? (
                <Link to={`/vendors/${po.vendorId}`} className="text-primary hover:underline">
                  {po.vendor.name}
                </Link>
              ) : (
                '-'
              )
            }
          />
          <MetaItem label="ผู้สร้าง" value={po.createdByUser?.fullName ?? '-'} />
          <MetaItem label="กำหนดส่ง" value={formatDate(po.expectedDeliveryDate)} />
          <MetaItem
            label="วันที่รับจริง"
            value={po.actualDeliveryDate ? formatDate(po.actualDeliveryDate) : '-'}
          />
          <MetaItem
            label="ยอดรวม"
            value={
              <span className="font-mono tabular-nums">
                {formatCurrency(Number(po.totalAmount))}
              </span>
            }
          />
        </dl>

        {po.notes && <p className="mt-4 text-sm text-muted-foreground">{po.notes}</p>}
      </CardContent>
    </Card>
  )
}
