import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

const rejectSchema = z.object({
  reason: z.string().trim().min(1, 'กรุณาระบุเหตุผล'),
})

type RejectFormValues = z.infer<typeof rejectSchema>

interface RejectReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void
  isPending?: boolean
}

export function RejectReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: RejectReasonDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: '' },
  })

  useEffect(() => {
    if (!open) reset({ reason: '' })
  }, [open, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit((v) => onConfirm(v.reason))}>
          <DialogHeader>
            <DialogTitle>ปฏิเสธคำขอซื้อ</DialogTitle>
            <DialogDescription>ระบุเหตุผลในการปฏิเสธ — ผู้ขอจะเห็นข้อความนี้</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-4">
            <Label htmlFor="reject-reason">เหตุผล</Label>
            <Textarea id="reject-reason" {...register('reason')} />
            <p className="text-sm text-destructive min-h-[1.25rem]">{errors.reason?.message}</p>
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
                  label: 'ยืนยันปฏิเสธ',
                  type: 'submit',
                  variant: 'destructive',
                  disabled: isPending,
                },
              ]}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
