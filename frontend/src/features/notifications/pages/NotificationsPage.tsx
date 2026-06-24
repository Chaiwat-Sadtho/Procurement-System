import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { useNotifications } from '../hooks/useNotifications'
import { useNotificationMutations } from '../hooks/useNotificationMutations'
import { NotificationItem } from '../components/NotificationItem'

export function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { data, isLoading } = useNotifications({ page, limit: 20, unreadOnly })
  const { markAllReadMutation } = useNotificationMutations()

  const items = data?.data ?? []
  const totalPages = data?.meta.totalPages ?? 1

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">การแจ้งเตือน</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setUnreadOnly((v) => !v)
              setPage(1)
            }}
          >
            เฉพาะที่ยังไม่อ่าน
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            อ่านทั้งหมด
          </Button>
        </div>
      </div>

      <div className="divide-y rounded-md border bg-card">
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</p>
        ) : (
          items.map((n) => <NotificationItem key={n.id} notification={n} />)
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ก่อนหน้า
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            ถัดไป
          </Button>
        </div>
      )}
    </div>
  )
}
