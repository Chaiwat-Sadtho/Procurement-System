import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PurchaseRequest, PrStatus } from './entities/purchase-request.entity';
import { PurchaseRequestItem } from './entities/purchase-request-item.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { BudgetsService } from '../budgets/budgets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockUser: Partial<User> = {
  id: 1,
  role: UserRole.EMPLOYEE,
  departmentId: 1,
};

const mockManager: Partial<User> = {
  id: 2,
  role: UserRole.MANAGER,
  departmentId: 1,
};

const mockDraftPr: Partial<PurchaseRequest> = {
  id: 1,
  prNumber: 'PR-2025-0001',
  requesterId: 1,
  departmentId: 1,
  title: 'Test PR',
  status: PrStatus.DRAFT,
  items: [],
  totalEstimatedAmount: 0,
};

const mockSubmittedPr: Partial<PurchaseRequest> = {
  ...mockDraftPr,
  status: PrStatus.SUBMITTED,
};

const mockPrRepo = {
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockPrItemRepo = {
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockUserRepo = {
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
};

const mockBudgetsService = {
  reserveAmount: jest.fn().mockResolvedValue(undefined),
  releaseReservedAmount: jest.fn().mockResolvedValue(undefined),
};
const mockAuditLogsService = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotificationsService = {
  send: jest.fn().mockResolvedValue(undefined),
  sendToMany: jest.fn().mockResolvedValue(undefined),
};
// approve() ใช้ dataSource.transaction(cb) — mock ให้รัน cb พร้อม fake EntityManager
const mockTxManager = { save: jest.fn((_, e) => Promise.resolve(e)) };
const mockDataSource = {
  transaction: jest.fn((cb) => cb(mockTxManager)),
};

describe('PurchaseRequestsService', () => {
  let service: PurchaseRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseRequestsService,
        { provide: getRepositoryToken(PurchaseRequest), useValue: mockPrRepo },
        { provide: getRepositoryToken(PurchaseRequestItem), useValue: mockPrItemRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: BudgetsService, useValue: mockBudgetsService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get<PurchaseRequestsService>(PurchaseRequestsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create draft PR with calculated totals', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockPrRepo.count.mockResolvedValue(0);
      const mockItem = {
        itemName: 'Laptop', quantity: 2, unit: 'unit',
        estimatedUnitPrice: 30000, estimatedTotalPrice: 60000,
      };
      mockPrItemRepo.create.mockReturnValue(mockItem);
      const createdPr = { ...mockDraftPr, items: [mockItem], totalEstimatedAmount: 60000 };
      mockPrRepo.create.mockReturnValue(createdPr);
      mockPrRepo.save.mockResolvedValue(createdPr);

      const result = await service.create(1, {
        title: 'Test PR',
        requiredDate: '2025-12-31',
        items: [{ itemName: 'Laptop', quantity: 2, unit: 'unit', estimatedUnitPrice: 30000 }],
      });

      expect(result.status).toBe(PrStatus.DRAFT);
      expect(mockPrRepo.save).toHaveBeenCalled();
    });

    it('should generate PR number from MAX existing suffix, surviving a delete gap', async () => {
      // จำลองกรณีลบ PR กลางปีออก: count = 2 (count+1 จะได้ 0003 ซ้ำ) แต่ MAX จริงคือ PR-2026-0003
      const year = new Date().getFullYear();
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockPrRepo.count.mockResolvedValue(2);
      mockPrRepo.findOne.mockResolvedValue({ id: 3, prNumber: `PR-${year}-0003` });

      let generatedPrNumber = '';
      mockPrItemRepo.create.mockReturnValue({ estimatedTotalPrice: 100 });
      mockPrRepo.create.mockImplementation((entity) => {
        generatedPrNumber = entity.prNumber;
        return { ...mockDraftPr, prNumber: entity.prNumber };
      });
      mockPrRepo.save.mockImplementation((e) => Promise.resolve(e));

      await service.create(1, {
        title: 'Test PR',
        requiredDate: '2026-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', estimatedUnitPrice: 100 }],
      });

      // MAX+1 = 0004 (ไม่ใช่ count+1 = 0003 ที่จะชน unique constraint)
      expect(generatedPrNumber).toBe(`PR-${year}-0004`);
    });

    it('should throw NotFoundException if requester not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create(999, {
          title: 'Test',
          requiredDate: '2025-12-31',
          items: [{ itemName: 'Item', quantity: 1, unit: 'unit', estimatedUnitPrice: 100 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('submit', () => {
    it('should transition draft PR to submitted', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockDraftPr });
      mockPrRepo.save.mockResolvedValue({ ...mockDraftPr, status: PrStatus.SUBMITTED });

      const result = await service.submit(1, 1);
      expect(result.status).toBe(PrStatus.SUBMITTED);
    });

    it('should throw BadRequestException when submitting non-draft PR', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockSubmittedPr });
      await expect(service.submit(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when PR not found or not owned by requester', async () => {
      mockPrRepo.findOne.mockResolvedValue(null);
      await expect(service.submit(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve a submitted PR', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockSubmittedPr });
      mockUserRepo.findOne.mockResolvedValue(mockManager);
      mockPrRepo.save.mockResolvedValue({
        ...mockSubmittedPr,
        status: PrStatus.APPROVED,
        approvedBy: 2,
      });

      const result = await service.approve(1, 2);
      expect(result.status).toBe(PrStatus.APPROVED);
    });

    it('should throw BadRequestException when approving non-submitted PR', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockDraftPr });
      await expect(service.approve(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when manager from different department', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockSubmittedPr, departmentId: 1 });
      mockUserRepo.findOne.mockResolvedValue({ ...mockManager, departmentId: 2 });
      await expect(service.approve(1, 2)).rejects.toThrow(ForbiddenException);
    });

    it('should reserve annual budget (quarter null) when approving a PR without quarter', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockSubmittedPr, quarter: null });
      mockUserRepo.findOne.mockResolvedValue(mockManager);

      await service.approve(1, 2);

      // P5-3: reserve ต้องส่ง quarter (null = งบรายปี) ตาม signature (deptId, fiscalYear, quarter, amount, txManager)
      expect(mockBudgetsService.reserveAmount).toHaveBeenCalledWith(
        mockSubmittedPr.departmentId,
        expect.any(Number),
        null,
        expect.any(Number),
        mockTxManager,
      );
    });

    it('P5-3: should reserve the PR quarter when approving a quarterly PR', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockSubmittedPr, quarter: 2 });
      mockUserRepo.findOne.mockResolvedValue(mockManager);

      await service.approve(1, 2);

      expect(mockBudgetsService.reserveAmount).toHaveBeenCalledWith(
        mockSubmittedPr.departmentId,
        expect.any(Number),
        2,
        expect.any(Number),
        mockTxManager,
      );
    });
  });

  describe('reject', () => {
    it('should reject a submitted PR with reason', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockSubmittedPr });
      mockUserRepo.findOne.mockResolvedValue(mockManager);
      mockPrRepo.save.mockResolvedValue({
        ...mockSubmittedPr,
        status: PrStatus.REJECTED,
        rejectReason: 'No budget',
      });

      const result = await service.reject(1, 2, { reason: 'No budget' });
      expect(result.status).toBe(PrStatus.REJECTED);
    });

    it('should throw BadRequestException when rejecting non-submitted PR', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockDraftPr });
      await expect(
        service.reject(1, 2, { reason: 'No budget' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a draft PR', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockDraftPr });
      mockPrRepo.remove.mockResolvedValue(undefined);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });

    it('should throw BadRequestException when deleting non-draft PR', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockSubmittedPr });
      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne access control', () => {
    it('should allow employee to access own PR', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockDraftPr, requesterId: 1 });
      const result = await service.findOne(1, { id: 1, role: UserRole.EMPLOYEE });
      expect(result.id).toBe(1);
    });

    it('should throw ForbiddenException when employee accesses another users PR', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockDraftPr, requesterId: 99 });
      await expect(
        service.findOne(1, { id: 1, role: UserRole.EMPLOYEE }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when manager accesses PR from different department', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockDraftPr, departmentId: 1 });
      mockUserRepo.findOne.mockResolvedValue({ ...mockManager, departmentId: 2 });
      await expect(
        service.findOne(1, { id: 2, role: UserRole.MANAGER }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
