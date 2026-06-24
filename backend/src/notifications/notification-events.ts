import { Notification, NotificationType } from './entities/notification.entity';

/** Single server→client event name. Keep in sync with the FE socket handler. */
export const NOTIFICATION_NEW_EVENT = 'notification:new';

/** Wire shape pushed to a client. Drops userId/user relation (recipient is implicit by room). */
export interface NotificationDto {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  referenceId: number | null;
  referenceType: string | null;
  createdAt: Date;
}

export function toNotificationDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    referenceId: n.referenceId,
    referenceType: n.referenceType,
    createdAt: n.createdAt,
  };
}
