import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceiptNote, GrnStatus } from './entities/goods-receipt-note.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { PurchaseOrder, PoStatus } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../purchase-orders/entities/purchase-order-item.entity';
import { ItemCondition } from './entities/goods-receipt-item.entity';
import { PurchaseRequest } from '../purchase-requests/entities/purchase-request.entity';
import { BudgetsService } from '../budgets/budgets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPoItem: Partial<PurchaseOrderItem> = {
  id: 1, quantity: 2, receivedQuantity: 0, itemName: 'Laptop',
};

const mockAcknowledgedPo: Partial<PurchaseOrder> = {
  id: 1, status: PoStatus.ACKNOWLEDGED,
  items: [mockPoItem as PurchaseOrderItem],
};

const mockGrn: Partial<GoodsReceiptNote> = {
  id: 1, grnNumber: 'GRN-2025-0001', poId: 1,
};

// mock สำหรับ transaction — เราต้องจำลอง DataSource.transaction()
const createMockEntityManager = (po: Partial<PurchaseOrder>) => ({
  findOne: jest.fn().mockImplementation((entity: any) => {
    if (entity === PurchaseOrder) return Promise.resolve({ ...po });
    return Promise.resolve(null);
  }),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn().mockReturnValue(mockGrn),
  save: jest.fn().mockImplementation((entity, data) => Promise.resolve(data || mockGrn)),
});

type MockManager = ReturnType<typeof createMockEntityManager>;

// jest types the calls of an untyped jest.fn() as any[]; read call arguments through
// these helpers so the argument assertions stay type-checked without `any`.
const callsOf = (fn: jest.Mock): unknown[][] => fn.mock.calls as unknown[][];
const savedAs = <T>(fn: jest.Mock, entity: unknown): T[] =>
  callsOf(fn)
    .filter((c) => c[0] === entity)
    .map((c) => c[1] as T);

const mockDataSource = {
  transaction: jest.fn(),
};

const mockGrnRepo = {
  createQueryBuilder: jest.fn(),
};

const mockBudgetsService = { consumeAmount: jest.fn() };
const mockAuditLogsService = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotificationsService = { send: jest.fn().mockResolvedValue(undefined) };

describe('GoodsReceiptsService', () => {
  let service: GoodsReceiptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsReceiptsService,
        { provide: getRepositoryToken(GoodsReceiptNote), useValue: mockGrnRepo },
        { provide: getRepositoryToken(GoodsReceiptItem), useValue: {} },
        { provide: getRepositoryToken(PurchaseOrder), useValue: {} },
        { provide: getRepositoryToken(PurchaseOrderItem), useValue: {} },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: BudgetsService, useValue: mockBudgetsService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get<GoodsReceiptsService>(GoodsReceiptsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create GRN and set PO to partially_received when not all items received', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      // po has 1 item with quantity=2, receiving only 1
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        return Promise.resolve(null);
      });
      manager.save.mockResolvedValue(mockGrn);
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      await service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 1, condition: ItemCondition.GOOD }],
      });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      // PO status should be partially_received (receivedQty 1 < quantity 2)
      const savedPoCalls = savedAs<PurchaseOrder>(manager.save, PurchaseOrder);
      expect(savedPoCalls[0].status).toBe(PoStatus.PARTIALLY_RECEIVED);
    });

    it('should set PO to completed when all items fully received', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        return Promise.resolve(null);
      });
      manager.save.mockResolvedValue(mockGrn);
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      await service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 2, condition: ItemCondition.GOOD }],
      });

      const savedPoCalls = savedAs<PurchaseOrder>(manager.save, PurchaseOrder);
      expect(savedPoCalls[0].status).toBe(PoStatus.COMPLETED);
    });

    it('should consume budget + fire audit/notification when all items received', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo,
            prId: 7,
            totalAmount: 1000,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        if (entity === PurchaseRequest) {
          return Promise.resolve({
            id: 7, departmentId: 3, fiscalYear: 2025, quarter: 2, totalEstimatedAmount: 1200,
          });
        }
        return Promise.resolve(null);
      });
      manager.save.mockResolvedValue(mockGrn);
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      await service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 2, condition: ItemCondition.GOOD }],
      });

      // P5-6: reserved สะท้อนยอด PO จริง → consume release ยอด PO (1000) ไม่ใช่ PR estimate (1200), usedToAdd=PO amount
      expect(mockBudgetsService.consumeAmount).toHaveBeenCalledWith(
        3, 2025, 2, 1000, 1000, manager,
      );
      // audit + notification ยิงหลัง commit
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GRN_CREATED',
          entityType: 'GoodsReceiptNote',
          entityId: mockGrn.id,
          newValue: expect.objectContaining({ poCompleted: true }) as unknown,
        }),
        manager, // audit now joins the GRN transaction
      );
      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          referenceId: mockGrn.id,
          referenceType: 'GoodsReceiptNote',
        }),
      );
    });

    it('should NOT consume budget or send notification when only partially received', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo, prId: 7, totalAmount: 1000,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        return Promise.resolve(null);
      });
      manager.save.mockResolvedValue(mockGrn);
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      await service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 1, condition: ItemCondition.GOOD }],
      });

      expect(mockBudgetsService.consumeAmount).not.toHaveBeenCalled();
      expect(mockNotificationsService.send).not.toHaveBeenCalled();
      // audit ยิงทุกครั้งที่สร้าง GRN สำเร็จ — และต้อง join tx (ส่ง manager) เหมือน full-receipt
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'GRN_CREATED' }),
        manager,
      );
    });

    it('should skip consume + warn (not throw) when PR not found on full receipt', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo, prId: 7, totalAmount: 1000,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        // PR lookup คืน null (ข้อมูลเพี้ยน)
        return Promise.resolve(null);
      });
      manager.save.mockResolvedValue(mockGrn);
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));
      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await expect(
        service.create(1, {
          poId: 1,
          receivedDate: '2025-11-15',
          items: [{ poItemId: 1, receivedQuantity: 2, condition: ItemCondition.GOOD }],
        }),
      ).resolves.toBeDefined();

      expect(mockBudgetsService.consumeAmount).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should throw BadRequest if PO is not in receivable status', async () => {
      const manager = createMockEntityManager({ ...mockAcknowledgedPo, status: PoStatus.DRAFT });
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      await expect(service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 1, condition: ItemCondition.GOOD }],
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest on over-receipt (received > ordered) (P4-3)', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        return Promise.resolve(null);
      });
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      // PO item สั่ง 2 แต่รับ 5 → ต้องโยน BadRequest
      await expect(service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 5, condition: ItemCondition.GOOD }],
      })).rejects.toThrow(BadRequestException);
    });

    it('should scope GRN running number lookup to current year (yearly reset)', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        return Promise.resolve(null);
      });
      manager.save.mockResolvedValue(mockGrn);
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      await service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 1, condition: ItemCondition.GOOD }],
      });

      const year = new Date().getFullYear();
      // GRN number มาจาก MAX(grnNumber) ของปีปัจจุบัน (findOne + ORDER BY DESC) ไม่ใช่ count
      const grnFindArgs = callsOf(manager.findOne).find((c) => c[0] === GoodsReceiptNote);
      const grnOpts = grnFindArgs?.[1] as {
        where: { grnNumber: { value: string } };
        order: { grnNumber: string };
      };
      expect(grnOpts.where.grnNumber.value).toBe(`GRN-${year}-%`);
      expect(grnOpts.order.grnNumber).toBe('DESC');
    });

    it('should NOT count damaged items toward receivedQuantity (PO stays partially_received)', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        return Promise.resolve(null);
      });
      manager.save.mockResolvedValue(mockGrn);
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      // รับครบ 2 ชิ้น แต่ทั้งหมดชำรุด → ไม่นับเป็นของที่รับจริง
      await service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 2, condition: ItemCondition.DAMAGED }],
      });

      const savedPoItemCalls = savedAs<PurchaseOrderItem>(manager.save, PurchaseOrderItem);
      expect(savedPoItemCalls[0].receivedQuantity).toBe(0);
      const savedPoCalls = savedAs<PurchaseOrder>(manager.save, PurchaseOrder);
      expect(savedPoCalls[0].status).toBe(PoStatus.PARTIALLY_RECEIVED);
    });

    it('should reject duplicate poItemId in one payload that cumulatively over-receives (P4-3)', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        return Promise.resolve(null);
      });
      manager.save.mockResolvedValue(mockGrn);
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      // poItem 1 สั่ง 2 — payload เดียวส่งซ้ำ 2 บรรทัด (2 + 1 = 3) ต้องโยน BadRequest แม้แต่ละบรรทัดไม่เกิน
      await expect(service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [
          { poItemId: 1, receivedQuantity: 2, condition: ItemCondition.GOOD },
          { poItemId: 1, receivedQuantity: 1, condition: ItemCondition.GOOD },
        ],
      })).rejects.toThrow(BadRequestException);
    });

    it('should keep PO partially_received when one of several items is not fully received', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo,
            items: [
              { id: 1, quantity: 2, receivedQuantity: 0 },
              { id: 2, quantity: 2, receivedQuantity: 0 },
            ],
          });
        }
        return Promise.resolve(null);
      });
      manager.save.mockResolvedValue(mockGrn);
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      // item 1 รับครบ (2/2) แต่ item 2 รับแค่ 1/2 → PO ต้องยังเป็น partially_received
      await service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [
          { poItemId: 1, receivedQuantity: 2, condition: ItemCondition.GOOD },
          { poItemId: 2, receivedQuantity: 1, condition: ItemCondition.GOOD },
        ],
      });

      const savedPoCalls = savedAs<PurchaseOrder>(manager.save, PurchaseOrder);
      expect(savedPoCalls[0].status).toBe(PoStatus.PARTIALLY_RECEIVED);
    });

    it('should throw ConflictException if grn_number collides (23505) instead of leaking 500', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        return Promise.resolve(null);
      });
      const dbErr = new QueryFailedError('insert', [], new Error('dup'));
      (dbErr as { code?: string }).code = '23505';
      manager.save.mockRejectedValue(dbErr);
      mockDataSource.transaction.mockImplementation((cb: (m: MockManager) => unknown) => cb(manager));

      await expect(service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 1, condition: ItemCondition.GOOD }],
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    const makeQb = () => {
      const qb: Record<string, jest.Mock> = {};
      for (const m of ['leftJoinAndSelect', 'andWhere', 'orderBy', 'skip', 'take']) {
        qb[m] = jest.fn().mockReturnValue(qb);
      }
      qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      return qb;
    };

    it('should filter by status when status is provided', async () => {
      const qb = makeQb();
      mockGrnRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: GrnStatus.PARTIAL });

      expect(qb.andWhere).toHaveBeenCalledWith('grn.status = :status', {
        status: GrnStatus.PARTIAL,
      });
    });

    it('should NOT filter by status when status is absent', async () => {
      const qb = makeQb();
      mockGrnRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({});

      const calledWithStatus = qb.andWhere.mock.calls.some(
        (c: unknown[]) => c[0] === 'grn.status = :status',
      );
      expect(calledWithStatus).toBe(false);
    });
  });
});
