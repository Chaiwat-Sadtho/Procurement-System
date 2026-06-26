import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/shared/components/PageHeader'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { Button } from '@/shared/components/ui/button'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { usePurchaseRequest } from '../hooks/usePurchaseRequest'
import { PRForm } from '../components/PRForm'
import { createDefaultValues, prToFormValues } from '../lib/prFormSchema'

function Notice({ message, to }: { message: string; to?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
      <p>{message}</p>
      {to && (
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to={to}>กลับ</Link>
        </Button>
      )}
    </div>
  )
}

export function PRFormPage() {
  const { id } = useParams()
  const isEdit = id != null
  const prId = Number(id)
  const { data: user } = useCurrentUser()
  const { data: pr, isLoading, isError } = usePurchaseRequest(isEdit ? prId : 0)

  if (!isEdit) {
    return (
      <div>
        <PageHeader title="สร้างคำขอซื้อ" description="กรอกรายละเอียดและรายการที่ต้องการจัดซื้อ" />
        <PRForm mode="create" defaultValues={createDefaultValues()} />
      </div>
    )
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (isError || !pr) {
    return <Notice message="ไม่พบใบขอซื้อ" to="/purchase-requests" />
  }

  if (pr.status !== 'draft' || !user || user.id !== pr.requesterId) {
    return <Notice message="แก้ไขได้เฉพาะใบร่างของคุณ" to={`/purchase-requests/${pr.id}`} />
  }

  return (
    <div>
      <PageHeader title={`แก้ไข ${pr.prNumber}`} description="แก้ไขใบร่างคำขอซื้อ" />
      <PRForm mode="edit" prId={pr.id} defaultValues={prToFormValues(pr)} />
    </div>
  )
}
