import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogsService } from '@app/audit-logs/audit-logs.service';
import { AuditLog } from '@app/audit-logs/entities/audit-log.entity';

describe('AuditLogsService.log', () => {
  let service: AuditLogsService;
  const mockRepo = {
    create: jest.fn((dto: Partial<AuditLog>) => dto),
    save: jest.fn((entry) => Promise.resolve({ id: 1, ...entry })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogsService, { provide: getRepositoryToken(AuditLog), useValue: mockRepo }],
    }).compile();
    service = module.get<AuditLogsService>(AuditLogsService);
  });

  const params = {
    userId: 1,
    action: 'PR_SUBMITTED',
    entityType: 'PurchaseRequest',
    entityId: 9,
  };

  it('saves through the injected repository when no manager is given', async () => {
    await service.log(params);
    expect(mockRepo.create).toHaveBeenCalledWith({
      userId: 1,
      action: 'PR_SUBMITTED',
      entityType: 'PurchaseRequest',
      entityId: 9,
      oldValue: null,
      newValue: null,
    });
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('saves through the transaction manager when one is given (joins the caller tx)', async () => {
    const manager = {
      save: jest.fn((_entity, entry) => Promise.resolve(entry)),
    };
    await service.log(params, manager as never);
    expect(manager.save).toHaveBeenCalledWith(
      AuditLog,
      expect.objectContaining({
        action: 'PR_SUBMITTED',
        entityId: 9,
        oldValue: null,
      }),
    );
    // mutation-proven: the repository path must NOT run when a manager is supplied
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
