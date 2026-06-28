import { useEffect } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { ActionButtons } from '@/shared/components/ActionButtons'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { StarRating } from '@/shared/components/StarRating'
import { rateVendorSchema, type RateVendorFormValues } from '../lib/rateVendorSchema'
import type { RateVendorPayload } from '../types'

interface RateVendorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorName: string
  onConfirm: (payload: RateVendorPayload) => void
  isPending?: boolean
}

export function RateVendorDialog({
  open,
  onOpenChange,
  vendorName,
  onConfirm,
  isPending = false,
}: RateVendorDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<RateVendorFormValues>({
    resolver: zodResolver(rateVendorSchema),
    defaultValues: { score: 0, comment: '' },
    mode: 'onChange',
  })

  const score = useWatch({ control, name: 'score' })

  useEffect(() => {
    if (!open) reset({ score: 0, comment: '' })
  }, [open, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={handleSubmit((v) => {
            const trimmed = v.comment?.trim()
            onConfirm({ score: v.score, ...(trimmed ? { comment: trimmed } : {}) })
          })}
        >
          <DialogHeader>
            <DialogTitle>ให้คะแนนผู้ขาย: {vendorName}</DialogTitle>
            <DialogDescription>
              ให้คะแนนความพึงพอใจหลังรับของครบ (ให้คะแนนได้ครั้งเดียว)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>คะแนน</Label>
              <Controller
                control={control}
                name="score"
                render={({ field }) => (
                  <StarRating value={field.value} onChange={field.onChange} label="คะแนน" />
                )}
              />
              {!score && <p className="text-sm text-muted-foreground">เลือกดาวเพื่อให้คะแนน</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rating-comment">ความคิดเห็น (ไม่บังคับ)</Label>
              <Textarea id="rating-comment" {...register('comment')} />
            </div>
          </div>
          <DialogFooter>
            <ActionButtons
              cols={2}
              className="w-full"
              buttons={[
                {
                  key: 'cancel',
                  label: 'ยกเลิก',
                  type: 'button',
                  variant: 'outline',
                  disabled: isPending,
                  onClick: () => onOpenChange(false),
                },
                {
                  key: 'confirm',
                  label: 'บันทึกคะแนน',
                  type: 'submit',
                  disabled: !isValid || isPending,
                },
              ]}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
