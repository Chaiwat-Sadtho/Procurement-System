export type NotificationType =
  | 'pr_submitted'
  | 'pr_approved'
  | 'pr_rejected'
  | 'po_created'
  | 'po_acknowledged'
  | 'grn_created'
  | 'budget_warning'

export interface AppNotification {
  id: number
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  referenceId: number | null
  referenceType: string | null
  createdAt: string
}

export interface NotificationListResponse {
  data: AppNotification[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface NotificationQuery {
  page?: number
  limit?: number
  unreadOnly?: boolean
}
