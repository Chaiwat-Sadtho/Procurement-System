import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import { usePurchaseOrder } from '../hooks/usePurchaseOrder'
import { PODetailHeader } from '../components/PODetailHeader'
import { POItemsTable } from '../components/POItemsTable'
import { POGrnHistory } from '../components/POGrnHistory'
import { POActions } from '../components/POActions'
import { PORatingSection } from '../components/PORatingSection'

type POAction = 'send' | 'acknowledge' | 'cancel'

export function PODetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const poId = Number(id)
  const validId = Number.isInteger(poId) && poId > 0

  const {
    data: po,
    isLoading,
    isError,
    sendMutation,
    acknowledgeMutation,
    cancelMutation,
    grnsQuery,
  } = usePurchaseOrder(validId ? poId : 0)
  const { data: user } = useCurrentUser()

  const [confirmAction, setConfirmAction] = useState<POAction | null>(null)

  if (!validId || isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>ไม่พบใบสั่งซื้อนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</AlertTitle>
        <AlertDescription>
          <Link to="/purchase-orders" className="underline">
            กลับไปรายการ
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || !po) {
    return (
      <div data-testid="po-detail-loading" className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  const isPending =
    sendMutation.isPending || acknowledgeMutation.isPending || cancelMutation.isPending

  const DIALOG_COPY: Record<
    POAction,
    {
      title: string
      description: string
      confirmLabel: string
      success: string
      destructive: boolean
    }
  > = {
    send: {
      title: 'ยืนยันการส่งใบสั่งซื้อ',
      description: 'ส่งใบสั่งซื้อนี้ให้ผู้ขาย หลังส่งแล้วจะแก้ไขไม่ได้',
      confirmLabel: 'ยืนยันส่ง',
      success: 'ส่งใบสั่งซื้อแล้ว',
      destructive: false,
    },
    acknowledge: {
      title: 'ยืนยันการรับทราบ',
      description: 'บันทึกว่าผู้ขายรับทราบใบสั่งซื้อนี้แล้ว',
      confirmLabel: 'ยืนยันรับทราบ',
      success: 'บันทึกการรับทราบแล้ว',
      destructive: false,
    },
    cancel: {
      title: 'ยืนยันการยกเลิกใบสั่งซื้อ',
      description: 'ใบสั่งซื้อนี้จะถูกยกเลิกและคืนงบที่จองไว้ ยืนยันหรือไม่',
      confirmLabel: 'ยืนยันยกเลิก',
      success: 'ยกเลิกใบสั่งซื้อแล้ว',
      destructive: true,
    },
  }

  function handleConfirm() {
    if (!confirmAction) return
    const mutation =
      confirmAction === 'send'
        ? sendMutation
        : confirmAction === 'acknowledge'
          ? acknowledgeMutation
          : cancelMutation
    const successMessage = DIALOG_COPY[confirmAction].success
    mutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(successMessage)
        setConfirmAction(null)
      },
      onError: (e: unknown) => {
        toast.error(getApiErrorMessage(e))
        setConfirmAction(null)
      },
    })
  }

  const copy = confirmAction ? DIALOG_COPY[confirmAction] : null

  return (
    <div>
      <PODetailHeader
        po={po}
        actions={
          user ? (
            <POActions
              po={po}
              user={user}
              onEdit={() => navigate(`/purchase-orders/${po.id}/edit`)}
              onSend={() => setConfirmAction('send')}
              onAcknowledge={() => setConfirmAction('acknowledge')}
              onCancel={() => setConfirmAction('cancel')}
            />
          ) : undefined
        }
      />

      <POItemsTable items={po.items} totalAmount={Number(po.totalAmount)} />

      <POGrnHistory grns={grnsQuery.data ?? []} />

      {user && <PORatingSection po={po} user={user} />}

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmAction(null)
        }}
        title={copy?.title ?? ''}
        description={copy?.description ?? ''}
        confirmLabel={copy?.confirmLabel ?? 'ยืนยัน'}
        variant={copy?.destructive ? 'destructive' : 'default'}
        isPending={isPending}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
