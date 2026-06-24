import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from '@app/notifications/notifications.service';
import { NotificationsGateway } from '@app/notifications/notifications.gateway';
import { Notification, NotificationType } from '@app/notifications/entities/notification.entity';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
};
const mockGateway = { emitToUser: jest.fn() };

describe('NotificationsService (real-time)', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: mockRepo },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();
    service = moduleRef.get(NotificationsService);
    jest.clearAllMocks();
  });

  it('send: persists then emits the saved notification to its user', async () => {
    const saved = {
      id: 5,
      userId: 7,
      title: 'T',
      message: 'M',
      type: NotificationType.PR_APPROVED,
      isRead: false,
      referenceId: 1,
      referenceType: 'PurchaseRequest',
      createdAt: new Date(),
    } as Notification;
    mockRepo.create.mockReturnValue(saved);
    mockRepo.save.mockResolvedValue(saved);

    const result = await service.send({
      userId: 7,
      title: 'T',
      message: 'M',
      type: NotificationType.PR_APPROVED,
    });

    expect(result).toBe(saved);
    expect(mockGateway.emitToUser).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ id: 5, title: 'T' }),
    );
  });

  it('sendToMany: emits to every recipient with their own saved row', async () => {
    const rows = [
      {
        id: 1,
        userId: 11,
        title: 'T',
        message: 'M',
        type: NotificationType.PR_SUBMITTED,
        isRead: false,
        referenceId: null,
        referenceType: null,
        createdAt: new Date(),
      },
      {
        id: 2,
        userId: 22,
        title: 'T',
        message: 'M',
        type: NotificationType.PR_SUBMITTED,
        isRead: false,
        referenceId: null,
        referenceType: null,
        createdAt: new Date(),
      },
    ] as Notification[];
    mockRepo.create.mockImplementation((v: Partial<Notification>) => v as Notification);
    mockRepo.save.mockResolvedValue(rows);

    await service.sendToMany([11, 22], {
      title: 'T',
      message: 'M',
      type: NotificationType.PR_SUBMITTED,
    });

    expect(mockGateway.emitToUser).toHaveBeenCalledTimes(2);
    expect(mockGateway.emitToUser).toHaveBeenCalledWith(11, expect.objectContaining({ id: 1 }));
    expect(mockGateway.emitToUser).toHaveBeenCalledWith(22, expect.objectContaining({ id: 2 }));
  });

  it('send: emit failure is swallowed — persist still returns (best-effort)', async () => {
    const saved = {
      id: 9,
      userId: 7,
      title: 'T',
      message: 'M',
      type: NotificationType.PR_APPROVED,
      isRead: false,
      referenceId: null,
      referenceType: null,
      createdAt: new Date(),
    } as Notification;
    mockRepo.create.mockReturnValue(saved);
    mockRepo.save.mockResolvedValue(saved);
    mockGateway.emitToUser.mockImplementation(() => {
      throw new Error('socket boom');
    });

    await expect(
      service.send({ userId: 7, title: 'T', message: 'M', type: NotificationType.PR_APPROVED }),
    ).resolves.toBe(saved);
  });

  it('unreadCount: counts the user unread rows', async () => {
    mockRepo.count.mockResolvedValue(3);
    const n = await service.unreadCount(7);
    expect(n).toBe(3);
    expect(mockRepo.count).toHaveBeenCalledWith({ where: { userId: 7, isRead: false } });
  });
});
