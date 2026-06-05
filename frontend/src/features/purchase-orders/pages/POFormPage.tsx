import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/components/ui/button'
import { usePurchaseOrder } from '../hooks/usePurchaseOrder'
import { POForm } from '../components/POForm'
import { createDefaultValues, poToFormValues } from '../lib/poFormSchema'

function Notice({ message, to }: { message: string; to?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
      <p>{message}</p>
      {to && (
        <Button asChild variant="outline">
          <Link to={to}>กลับ</Link>
        </Button>
      )}
    </div>
  )
}

export function POFormPage() {
  const { id } = useParams()
  const isEdit = id != null
  const poId = Number(id)
  const { data: po, isLoading, isError } = usePurchaseOrder(isEdit ? poId : 0)

  if (!isEdit) {
    return (
      <div>
        <PageHeader title="สร้างใบสั่งซื้อ" description="เลือกใบขอซื้อที่อนุมัติแล้วและกรอกรายละเอียด" />
        <POForm mode="create" defaultValues={createDefaultValues()} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (isError || !po) {
    return <Notice message="ไม่พบใบสั่งซื้อ" to="/purchase-orders" />
  }

  if (po.status !== 'draft') {
    return (
      <Notice
        message="แก้ไขได้เฉพาะใบสั่งซื้อที่เป็นฉบับร่าง"
        to={`/purchase-orders/${po.id}`}
      />
    )
  }

  return (
    <div>
      <PageHeader title={`แก้ไข ${po.poNumber}`} description="แก้ไขฉบับร่างใบสั่งซื้อ" />
      {/* key={po.id} forces a remount when navigating edit -> edit between two ids,
          so react-hook-form re-seeds from the new PO's defaultValues instead of keeping stale prefill */}
      <POForm key={po.id} mode="edit" poId={po.id} pr={po.purchaseRequest} defaultValues={poToFormValues(po)} />
    </div>
  )
}
