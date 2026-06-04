import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { StarRating } from '@/shared/components/StarRating'
import { formatDate } from '@/shared/lib/utils'
import type { User } from '@/shared/types'
import { useVendorRatingForPo } from '../hooks/useVendorRatingForPo'
import { useRateVendor } from '../hooks/useRateVendor'
import { ratingErrorMessage } from '../lib/ratingErrorMessage'
import { RateVendorDialog } from './RateVendorDialog'
import type { PurchaseOrder, RateVendorPayload } from '../types'

interface PORatingSectionProps {
  po: PurchaseOrder
  user: User
}

export function PORatingSection({ po, user }: PORatingSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const isCompleted = po.status === 'completed'
  const { data: rating, isLoading } = useVendorRatingForPo(po.id, { enabled: isCompleted })
  const rateMutation = useRateVendor(po.id, po.vendorId)

  if (!isCompleted) return null

  const isOfficer = user.role === 'procurement_officer'

  function handleConfirm(payload: RateVendorPayload) {
    rateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('บันทึกคะแนนแล้ว')
        setDialogOpen(false)
      },
      onError: (e: unknown) => {
        // 409/อื่น ๆ → useRateVendor.onError invalidate ['purchase-order', id, 'rating'] แล้ว
        // (section resync เป็น read-only เอง) — ที่นี่แค่ surface ข้อความ + ปิด dialog
        toast.error(ratingErrorMessage(e))
        setDialogOpen(false)
      },
    })
  }

  return (
    <div className="space-y-2 mt-6">
      <h2 className="text-base font-semibold">คะแนนผู้ขาย</h2>
      {isLoading ? (
        <Skeleton className="h-8 w-48" />
      ) : rating ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <StarRating value={rating.score} readOnly />
            <span className="text-sm text-muted-foreground">({rating.score}/5)</span>
          </div>
          <p className="text-sm">{rating.comment ?? 'ไม่มีความคิดเห็น'}</p>
          <p className="text-xs text-muted-foreground">{formatDate(rating.createdAt)}</p>
        </div>
      ) : isOfficer ? (
        <>
          <Button onClick={() => setDialogOpen(true)}>ให้คะแนนผู้ขาย</Button>
          <RateVendorDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            vendorName={po.vendor?.name ?? ''}
            onConfirm={handleConfirm}
            isPending={rateMutation.isPending}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">ยังไม่มีการให้คะแนนผู้ขาย</p>
      )}
    </div>
  )
}
