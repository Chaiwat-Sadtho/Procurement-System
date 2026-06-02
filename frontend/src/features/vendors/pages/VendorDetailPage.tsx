import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import { useVendor } from '../hooks/useVendor'
import { VendorDetailHeader } from '../components/VendorDetailHeader'
import { VendorActions } from '../components/VendorActions'
import { BlacklistReasonDialog } from '../components/BlacklistReasonDialog'

export function VendorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vendorId = Number(id)
  const validId = Number.isInteger(vendorId) && vendorId > 0

  const { data: vendor, isLoading, isError, blacklistMutation, unblacklistMutation } =
    useVendor(validId ? vendorId : 0)
  const { data: user } = useCurrentUser()

  const [blacklistOpen, setBlacklistOpen] = useState(false)
  const [unblacklistOpen, setUnblacklistOpen] = useState(false)

  if (!validId || isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>ไม่พบผู้ขายรายนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</AlertTitle>
        <AlertDescription>
          <Link to="/vendors" className="underline">
            กลับไปรายการ
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || !vendor) {
    return (
      <div data-testid="vendor-detail-loading" className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  function handleBlacklist(reason: string) {
    blacklistMutation.mutate(reason, {
      onSuccess: () => {
        toast.success('แบล็คลิสต์ผู้ขายแล้ว')
        setBlacklistOpen(false)
      },
      onError: (e) => {
        toast.error(getApiErrorMessage(e))
        setBlacklistOpen(false)
      },
    })
  }

  function handleUnblacklist() {
    unblacklistMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('ยกเลิกแบล็คลิสต์แล้ว')
        setUnblacklistOpen(false)
      },
      onError: (e) => {
        toast.error(getApiErrorMessage(e))
        setUnblacklistOpen(false)
      },
    })
  }

  return (
    <div>
      <VendorDetailHeader
        vendor={vendor}
        actions={
          user ? (
            <VendorActions
              vendor={vendor}
              user={user}
              onEdit={() => navigate(`/vendors/${vendor.id}/edit`)}
              onBlacklist={() => setBlacklistOpen(true)}
              onUnblacklist={() => setUnblacklistOpen(true)}
            />
          ) : undefined
        }
      />

      <BlacklistReasonDialog
        open={blacklistOpen}
        onOpenChange={setBlacklistOpen}
        onConfirm={handleBlacklist}
        isPending={blacklistMutation.isPending}
      />

      <ConfirmDialog
        open={unblacklistOpen}
        onOpenChange={setUnblacklistOpen}
        title="ยกเลิกแบล็คลิสต์ผู้ขาย"
        description="ผู้ขายรายนี้จะกลับมาใช้งานได้ตามปกติ ยืนยันหรือไม่"
        confirmLabel="ยืนยัน"
        isPending={unblacklistMutation.isPending}
        onConfirm={handleUnblacklist}
      />
    </div>
  )
}
