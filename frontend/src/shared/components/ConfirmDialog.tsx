import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { ActionButtons } from '@/shared/components/ActionButtons'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
  isPending?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = 'default',
  onConfirm,
  isPending = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
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
                label: confirmLabel,
                variant,
                disabled: isPending,
                onClick: onConfirm,
              },
            ]}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
