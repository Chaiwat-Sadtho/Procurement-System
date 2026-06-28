import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Switch } from '@/shared/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  announcementSchema,
  createDefaultValues,
  announcementToFormValues,
  type AnnouncementFormValues,
} from '../lib/announcementFormSchema'
import { ANNOUNCEMENT_ICON_OPTIONS } from '../lib/announcementIcons'
import type { Announcement } from '../types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcement: Announcement | null
  onSubmit: (values: AnnouncementFormValues) => void
  isPending?: boolean
}

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  announcement,
  onSubmit,
  isPending = false,
}: Props) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: createDefaultValues(),
    mode: 'onChange',
  })

  useEffect(() => {
    if (open) reset(announcement ? announcementToFormValues(announcement) : createDefaultValues())
  }, [open, announcement, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit((values) => onSubmit(values))}>
          <DialogHeader>
            <DialogTitle>{announcement ? 'แก้ไขประกาศ' : 'เพิ่มประกาศ'}</DialogTitle>
            <DialogDescription>ประกาศที่เปิดใช้งานจะแสดงบนหน้าเข้าสู่ระบบ</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="ann-title">หัวข้อ</Label>
              <Input id="ann-title" aria-label="หัวข้อ" {...register('title')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ann-detail">รายละเอียด</Label>
              <Textarea id="ann-detail" aria-label="รายละเอียด" {...register('detail')} />
            </div>

            <div className="space-y-1">
              <Label>ไอคอน</Label>
              <Controller
                control={control}
                name="icon"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="ไอคอน">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNOUNCEMENT_ICON_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex items-center gap-6">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="เปิดใช้งาน"
                    />
                    เปิดใช้งาน
                  </label>
                )}
              />
              <Controller
                control={control}
                name="isPinned"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="ปักหมุด"
                    />
                    ปักหมุด
                  </label>
                )}
              />
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
                  label: 'บันทึก',
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
