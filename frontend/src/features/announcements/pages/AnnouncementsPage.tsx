import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { ListLoadingState } from '@/shared/components/ListLoadingState'
import { ListErrorState } from '@/shared/components/ListErrorState'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { useAnnouncementMutations } from '../hooks/useAnnouncementMutations'
import { AnnouncementsTable } from '../components/AnnouncementsTable'
import { AnnouncementFormDialog } from '../components/AnnouncementFormDialog'
import { toPayload, type AnnouncementFormValues } from '../lib/announcementFormSchema'
import type { Announcement } from '../types'

export function AnnouncementsPage() {
  const { data: announcements, isLoading, isError, refetch } = useAnnouncements()
  const { createMutation, updateMutation, deleteMutation } = useAnnouncementMutations()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState<Announcement | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (a: Announcement) => {
    setEditing(a)
    setFormOpen(true)
  }

  const handleSubmit = (values: AnnouncementFormValues) => {
    const payload = toPayload(values)
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            toast.success('บันทึกประกาศแล้ว')
            setFormOpen(false)
          },
          onError: () => toast.error('บันทึกไม่สำเร็จ'),
        },
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('เพิ่มประกาศแล้ว')
          setFormOpen(false)
        },
        onError: () => toast.error('เพิ่มไม่สำเร็จ'),
      })
    }
  }

  const handleToggle = (a: Announcement, data: Partial<Announcement>) =>
    updateMutation.mutate(
      { id: a.id, data },
      { onError: () => toast.error('อัปเดตไม่สำเร็จ') },
    )

  const confirmDelete = () => {
    if (!deleting) return
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('ลบประกาศแล้ว')
        setDeleting(null)
      },
      onError: () => {
        toast.error('ลบไม่สำเร็จ')
        setDeleting(null)
      },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <PageHeader title="ประกาศ" description="จัดการประกาศที่แสดงบนหน้าเข้าสู่ระบบ" />
        <Button onClick={openCreate}>เพิ่มประกาศ</Button>
      </div>

      {isError ? (
        <ListErrorState message="โหลดประกาศไม่สำเร็จ" onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListLoadingState testId="announcements-loading" />
      ) : (announcements ?? []).length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">ยังไม่มีประกาศ</p>
      ) : (
        <AnnouncementsTable
          announcements={announcements ?? []}
          onEdit={openEdit}
          onToggleActive={(a, value) => handleToggle(a, { isActive: value })}
          onTogglePin={(a, value) => handleToggle(a, { isPinned: value })}
          onDelete={(a) => setDeleting(a)}
        />
      )}

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        announcement={editing}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="ยืนยันลบประกาศ"
        description={deleting ? `ลบประกาศ "${deleting.title}" ออกถาวร` : undefined}
        confirmLabel="ลบ"
        variant="destructive"
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
