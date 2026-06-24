import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { useNotifications } from '../hooks/useNotifications'
import { useNotificationMutations } from '../hooks/useNotificationMutations'
import { NotificationItem } from './NotificationItem'

export function NotificationDropdown({ onClose }: { onClose?: () => void }) {
  const { data, isLoading } = useNotifications({ limit: 10 })
  const { markAllReadMutation } = useNotificationMutations()
  const items = data?.data ?? []

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-semibold">การแจ้งเตือน</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1 text-xs"
          disabled={markAllReadMutation.isPending}
          onClick={() => markAllReadMutation.mutate()}
        >
          อ่านทั้งหมด
        </Button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</p>
        ) : (
          items.map((n) => <NotificationItem key={n.id} notification={n} onNavigate={onClose} />)
        )}
      </div>

      <div className="border-t px-4 py-2 text-center">
        <Link to="/notifications" className="text-xs text-primary hover:underline" onClick={onClose}>
          ดูทั้งหมด
        </Link>
      </div>
    </div>
  )
}
