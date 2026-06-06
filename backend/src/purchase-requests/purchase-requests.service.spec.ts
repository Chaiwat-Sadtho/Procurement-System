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
  transaction: jest.fn((cb: (m: typeof mockTxManager) => unknown) => cb(mockTxManager)),
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
      mockPrRepo.create.mockImplementation((entity: PurchaseRequest) => {
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

    // Minor #1: คูณ quantity × unitPrice ต้องใช้ decimal ไม่ใช่ float
    // 1.03 × 1.5 = 1.545 → ปัดครึ่งขึ้น = 1.55 (float .toFixed(2) ได้ 1.54 เพราะเก็บเป็น 1.5449999…)
    it('should compute item total with decimal precision (1.03 × 1.5 = 1.55)', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockPrRepo.count.mockResolvedValue(0);
      mockPrItemRepo.create.mockImplementation((e: PurchaseRequestItem) => e);
      let saved!: PurchaseRequest;
      mockPrRepo.create.mockImplementation((e: PurchaseRequest) => e);
      mockPrRepo.save.mockImplementation((e: PurchaseRequest) => {
        saved = e;
        return Promise.resolve(e);
      });

      await service.create(1, {
        title: 'Decimal PR',
        requiredDate: '2025-12-31',
        items: [{ itemName: 'X', quantity: 1.03, unit: 'unit', estimatedUnitPrice: 1.5 }],
      });

      expect(saved.items[0].estimatedTotalPrice).toBe(1.55);
      expect(saved.totalEstimatedAmount).toBe(1.55);
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

    it('throws BadRequest when requester has no department', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser, departmentId: null });
      await expect(
        service.create(1, { title: 'x', requiredDate: '2026-01-01', items: [] } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submit', () => {
    it('should transition draft PR to submitted', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockDraftPr });

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

      const result = await service.reject(1, 2, { reason: 'No budget' });
      expect(result.status).toBe(PrStatus.REJECTED);
      // reject เกิดได้เฉพาะตอน SUBMITTED (ยังไม่เคย reserve งบ) → ต้องไม่แตะ budget
      expect(mockBudgetsService.releaseReservedAmount).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when rejecting non-submitted PR', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockDraftPr });
      await expect(
        service.reject(1, 2, { reason: 'No budget' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequest when rejecting a PR with null department', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockSubmittedPr, departmentId: null });
      mockUserRepo.findOne.mockResolvedValue({ ...mockManager, departmentId: null });
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

    it('should load department relation so PR detail can show department name', async () => {
      const prWithDept = {
        ...mockDraftPr,
        requesterId: 1,
        department: { id: 1, name: 'IT' },
      };
      mockPrRepo.findOne.mockResolvedValue(prWithDept);

      const result = await service.findOne(1, { id: 1, role: UserRole.EMPLOYEE });

      expect(mockPrRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: expect.objectContaining({ department: true }) as unknown,
        }),
      );
      expect(result.department).toEqual({ id: 1, name: 'IT' });
    });
  });

  describe('null department guards', () => {
    it('approve throws BadRequest when PR has null department', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockSubmittedPr, departmentId: null });
      mockUserRepo.findOne.mockResolvedValue({ ...mockManager, departmentId: null });
      await expect(service.approve(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('findAll (manager) throws Forbidden when manager has null department', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockPrRepo.createQueryBuilder.mockReturnValue(qb);
      mockUserRepo.findOne.mockResolvedValue({ id: 2, role: UserRole.MANAGER, departmentId: null });
      await expect(
        service.findAll({ id: 2, role: UserRole.MANAGER }, {} as never),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll filters', () => {
    it('filters by prNumber (ILIKE partial match)', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockPrRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { id: 99, role: UserRole.PROCUREMENT_OFFICER },
        { prNumber: '0001' } as any,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'pr.prNumber ILIKE :prNumber',
        { prNumber: '%0001%' },
      );
    });

    it('filters by requesterId (exact match)', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockPrRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { id: 99, role: UserRole.PROCUREMENT_OFFICER },
        { requesterId: 5 } as any,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'pr.requesterId = :requesterId',
        { requesterId: 5 },
      );
    });

    it('Manager scope + requesterId stack independently in andWhere', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockPrRepo.createQueryBuilder.mockReturnValue(qb);
      mockUserRepo.findOne.mockResolvedValue({ id: 2, departmentId: 1 });

      await service.findAll(
        { id: 2, role: UserRole.MANAGER },
        { requesterId: 99 } as any,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'pr.departmentId = :deptId',
        { deptId: 1 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'pr.requesterId = :requesterId',
        { requesterId: 99 },
      );
    });

    it('filters by requesterName (CONCAT_WS of requester name ILIKE)', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockPrRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { id: 99, role: UserRole.PROCUREMENT_OFFICER },
        { requesterName: 'สมชาย' } as any,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        "CONCAT_WS(' ', requester.firstName, requester.middleName, requester.lastName) ILIKE :requesterName",
        { requesterName: '%สมชาย%' },
      );
    });
  });

  describe('findAll eligibleForPo filter', () => {
    const makeQb = () => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    });

    it('adds approved + dept-not-null + NOT EXISTS active-PO guards when eligibleForPo is true', async () => {
      const qb = makeQb();
      mockPrRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { id: 99, role: UserRole.PROCUREMENT_OFFICER },
        { eligibleForPo: true } as any,
      );

      expect(qb.andWhere).toHaveBeenCalledWith('pr.status = :eligibleStatus', {
        eligibleStatus: PrStatus.APPROVED,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('pr.departmentId IS NOT NULL');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.pr_id = pr.id AND po.status != :cancelledStatus)',
        { cancelledStatus: 'cancelled' },
      );
    });

    it('does NOT add the eligible guards when eligibleForPo is false', async () => {
      const qb = makeQb();
      mockPrRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { id: 99, role: UserRole.PROCUREMENT_OFFICER },
        { eligibleForPo: false } as any,
      );

      expect(qb.andWhere).not.toHaveBeenCalledWith('pr.departmentId IS NOT NULL');
      const calledWithNotExists = qb.andWhere.mock.calls.some((c: unknown[]) =>
        typeof c[0] === 'string' && c[0].includes('NOT EXISTS'),
      );
      expect(calledWithNotExists).toBe(false);
    });

    it('does NOT add the eligible guards when eligibleForPo is undefined', async () => {
      const qb = makeQb();
      mockPrRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { id: 99, role: UserRole.PROCUREMENT_OFFICER },
        {} as any,
      );

      expect(qb.andWhere).not.toHaveBeenCalledWith('pr.departmentId IS NOT NULL');
      const calledWithNotExists = qb.andWhere.mock.calls.some((c: unknown[]) =>
        typeof c[0] === 'string' && c[0].includes('NOT EXISTS'),
      );
      expect(calledWithNotExists).toBe(false);
    });
  });
});
