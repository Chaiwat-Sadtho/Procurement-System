import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import { usePurchaseRequest } from '../hooks/usePurchaseRequest'
import { usePRMutations } from '../hooks/usePRMutations'
import { PRDetailHeader } from '../components/PRDetailHeader'
import { PRItemsTable } from '../components/PRItemsTable'
import { PRActions } from '../components/PRActions'
import { RejectReasonDialog } from '../components/RejectReasonDialog'

export function PRDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const prId = Number(id)
  const validId = Number.isInteger(prId) && prId > 0

  const { data: pr, isLoading, isError, submitMutation, approveMutation, rejectMutation } =
    usePurchaseRequest(validId ? prId : 0)
  const { data: user } = useCurrentUser()
  const { deleteMutation } = usePRMutations()

  const [confirmAction, setConfirmAction] = useState<'submit' | 'approve' | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!validId || isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>ไม่พบใบขอซื้อนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</AlertTitle>
        <AlertDescription>
          <Link to="/purchase-requests" className="underline">
            กลับไปรายการ
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || !pr) {
    return (
      <div data-testid="pr-detail-loading" className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  const isPending =
    submitMutation.isPending || approveMutation.isPending || rejectMutation.isPending

  function handleConfirm() {
    if (confirmAction === 'submit') {
      submitMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success('ส่งคำขอซื้อเพื่อขออนุมัติแล้ว')
          setConfirmAction(null)
        },
        onError: (e) => {
          toast.error(getApiErrorMessage(e))
          setConfirmAction(null)
        },
      })
    } else if (confirmAction === 'approve') {
      approveMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success('อนุมัติคำขอซื้อแล้ว')
          setConfirmAction(null)
        },
        onError: (e) => {
          toast.error(getApiErrorMessage(e))
          setConfirmAction(null)
        },
      })
    }
  }

  function handleReject(reason: string) {
    rejectMutation.mutate(reason, {
      onSuccess: () => {
        toast.success('ปฏิเสธคำขอซื้อแล้ว')
        setRejectOpen(false)
      },
      onError: (e) => {
        toast.error(getApiErrorMessage(e))
        setRejectOpen(false)
      },
    })
  }

  return (
    <div>
      <PRDetailHeader
        pr={pr}
        actions={
          user ? (
            <PRActions
              pr={pr}
              user={user}
              onSubmit={() => setConfirmAction('submit')}
              onApprove={() => setConfirmAction('approve')}
              onReject={() => setRejectOpen(true)}
              onEdit={() => navigate(`/purchase-requests/${pr.id}/edit`)}
              onDelete={() => setDeleteOpen(true)}
            />
          ) : undefined
        }
      />

      <PRItemsTable items={pr.items} totalEstimatedAmount={pr.totalEstimatedAmount} />

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmAction(null)
        }}
        title={confirmAction === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการส่งขออนุมัติ'}
        description={
          confirmAction === 'approve'
            ? 'เมื่ออนุมัติแล้วระบบจะจองงบประมาณตามมูลค่าที่ประเมิน'
            : 'ส่งคำขอซื้อนี้ให้ผู้จัดการพิจารณาอนุมัติ'
        }
        confirmLabel={confirmAction === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันส่ง'}
        onConfirm={handleConfirm}
        isPending={isPending}
      />

      <RejectReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        isPending={rejectMutation.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="ลบใบร่างคำขอซื้อ"
        description="การลบไม่สามารถย้อนกลับได้ ต้องการลบใบร่างนี้หรือไม่"
        confirmLabel="ยืนยันลบ"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteMutation.mutate(pr.id, {
            onSuccess: () => {
              toast.success('ลบใบร่างแล้ว')
              navigate('/purchase-requests')
            },
            onError: (e) => toast.error(getApiErrorMessage(e)),
          })
        }
      />
    </div>
  )
}
