import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsGateway } from './notifications.gateway';
import { toNotificationDto } from './notification-events';

export interface SendNotificationParams {
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: number;
  referenceType?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async send(params: SendNotificationParams): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      referenceId: params.referenceId ?? null,
      referenceType: params.referenceType ?? null,
      isRead: false,
    });
    const saved = await this.notificationRepository.save(notification);
    this.safeEmit(saved);
    return saved;
  }

  async sendToMany(
    userIds: number[],
    params: Omit<SendNotificationParams, 'userId'>,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const notifications = userIds.map((userId) =>
      this.notificationRepository.create({
        userId,
        title: params.title,
        message: params.message,
        type: params.type,
        referenceId: params.referenceId ?? null,
        referenceType: params.referenceType ?? null,
        isRead: false,
      }),
    );
    const saved = await this.notificationRepository.save(notifications);
    for (const n of saved) this.safeEmit(n);
  }

  async findAll(
    userId: number,
    query: NotificationQueryDto,
  ): Promise<{
    data: Notification[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, unreadOnly } = query;

    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC');

    if (unreadOnly) qb.andWhere('n.isRead = false');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async markRead(id: number, userId: number): Promise<Notification | null> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (!notification) return null;
    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllRead(userId: number): Promise<void> {
    await this.notificationRepository.update({ userId, isRead: false }, { isRead: true });
  }

  unreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({ where: { userId, isRead: false } });
  }

  // Best-effort real-time push. Never lets a socket error break the DB write (invariant #10).
  private safeEmit(n: Notification): void {
    try {
      this.gateway.emitToUser(n.userId, toNotificationDto(n));
    } catch (err) {
      this.logger.warn(`ws emit failed for notification ${n.id}: ${String(err)}`);
    }
  }
}
