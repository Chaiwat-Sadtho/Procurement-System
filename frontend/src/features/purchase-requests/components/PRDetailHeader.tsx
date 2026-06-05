import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import { PRStatusBadge } from './PRStatusBadge'
import type { PurchaseRequest } from '../types'

interface PRDetailHeaderProps {
  pr: PurchaseRequest
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

export function PRDetailHeader({ pr, actions }: PRDetailHeaderProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <Link
          to="/purchase-requests"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> กลับไปรายการ
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">{pr.prNumber}</span>
              <PRStatusBadge status={pr.status} />
            </div>
            <h1 className="mt-1 text-2xl font-semibold">{pr.title}</h1>
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <MetaItem label="ผู้ขอ" value={pr.requester.fullName} />
          <MetaItem label="แผนก" value={pr.department?.name ?? '-'} />
          <MetaItem label="ไตรมาส" value={pr.quarter ?? '-'} />
          <MetaItem label="วันที่ขอ" value={formatDate(pr.createdAt)} />
          <MetaItem label="ต้องการภายใน" value={formatDate(pr.requiredDate)} />
          <MetaItem label="มูลค่าประเมิน" value={formatCurrency(pr.totalEstimatedAmount)} />
        </dl>

        {pr.status === 'rejected' && pr.rejectReason && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>เหตุผลที่ปฏิเสธ</AlertTitle>
            <AlertDescription>{pr.rejectReason}</AlertDescription>
          </Alert>
        )}

        {pr.status === 'approved' && pr.approver && (
          <p className="mt-4 text-sm text-muted-foreground">
            อนุมัติโดย {pr.approver.fullName}
            {pr.approvedAt && ` เมื่อ ${formatDate(pr.approvedAt)}`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
