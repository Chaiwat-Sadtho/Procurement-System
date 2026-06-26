import { createElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import { useNotificationMutations } from '../hooks/useNotificationMutations'
import { getNotificationIcon, getNotificationLink } from '../lib/notificationMeta'
import type { AppNotification } from '../types'

export function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: AppNotification
  onNavigate?: () => void
}) {
  const navigate = useNavigate()
  const { markReadMutation } = useNotificationMutations()
  // createElement (not <Icon/>) so the icon — selected at runtime from a static map —
  // isn't treated as a component created during render (react-hooks/static-components).
  const icon = createElement(getNotificationIcon(notification.type), {
    className: 'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground',
    'aria-hidden': 'true',
  })

  const handleClick = () => {
    if (!notification.isRead) markReadMutation.mutate(notification.id)
    const link = getNotificationLink(notification.referenceType, notification.referenceId)
    if (link) {
      navigate(link)
      onNavigate?.()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={markReadMutation.isPending}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50',
        !notification.isRead && 'bg-muted/30',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{notification.title}</span>
          {!notification.isRead && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="ยังไม่อ่าน" />
          )}
        </span>
        <span className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</span>
        <span className="mt-1 block text-[11px] text-muted-foreground">
          {new Date(notification.createdAt).toLocaleString('th-TH')}
        </span>
      </span>
    </button>
  )
}
