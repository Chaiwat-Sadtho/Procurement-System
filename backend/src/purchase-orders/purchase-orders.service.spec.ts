import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrder, PoStatus } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PurchaseRequest, PrStatus } from '../purchase-requests/entities/purchase-request.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { VendorRating } from '../vendors/entities/vendor-rating.entity';
import { BudgetsService } from '../budgets/budgets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockApprovedPr: Partial<PurchaseRequest> = {
  id: 1, status: PrStatus.APPROVED,
  departmentId: 1, fiscalYear: 2026, quarter: null, totalEstimatedAmount: 1000,
};

const mockVendor: Partial<Vendor> = {
  id: 1, name: 'Test Vendor', isBlacklisted: false,
};

const mockDraftPo: Partial<PurchaseOrder> = {
  id: 1, poNumber: 'PO-2025-0001',
  prId: 1, vendorId: 1,
  status: PoStatus.DRAFT, items: [],
};

const mockSentPo = { ...mockDraftPo, status: PoStatus.SENT };
const mockAckedPo = { ...mockDraftPo, status: PoStatus.ACKNOWLEDGED };
const mockCompletedPo = { ...mockDraftPo, status: PoStatus.COMPLETED, vendorId: 1 };

const mockPoRepo = {
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
};
const mockPoItemRepo = {
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};
const mockPrRepo = { findOne: jest.fn() };
const mockVendorRepo = { findOne: jest.fn(), update: jest.fn() };
const mockRatingRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
const mockDataSource = { transaction: jest.fn() };
const mockBudgetsService = {
  releaseReservedAmount: jest.fn().mockResolvedValue(undefined),
  adjustReservedAmount: jest.fn().mockResolvedValue(undefined),
};
const mockAuditLogsService = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotificationsService = { send: jest.fn().mockResolvedValue(undefined) };

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: getRepositoryToken(PurchaseOrder), useValue: mockPoRepo },
        { provide: getRepositoryToken(PurchaseOrderItem), useValue: mockPoItemRepo },
        { provide: getRepositoryToken(PurchaseRequest), useValue: mockPrRepo },
        { provide: getRepositoryToken(Vendor), useValue: mockVendorRepo },
        { provide: getRepositoryToken(VendorRating), useValue: mockRatingRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: BudgetsService, useValue: mockBudgetsService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    // create เปิด transaction (budget adjust + PO save atomic) — helper จำลอง manager.save
    const mockTxSave = (saveImpl: jest.Mock) => {
      const manager = { save: saveImpl };
      mockDataSource.transaction.mockImplementation(async (cb: (m: typeof manager) => unknown) => cb(manager));
      return manager;
    };

    it('should create PO from approved PR with non-blacklisted vendor', async () => {
      mockPrRepo.findOne.mockResolvedValue(mockApprovedPr);
      mockPoRepo.findOne.mockResolvedValue(null); // P4-2: ยังไม่มี active PO ผูกกับ PR นี้
      mockVendorRepo.findOne.mockResolvedValue(mockVendor);
      mockPoRepo.count.mockResolvedValue(0);
      const item = { itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 1000, totalPrice: 1000, receivedQuantity: 0 };
      mockPoItemRepo.create.mockReturnValue(item);
      const createdPo = { ...mockDraftPo, items: [item], totalAmount: 1000 };
      mockPoRepo.create.mockReturnValue(createdPo);
      mockTxSave(jest.fn().mockResolvedValue(createdPo));

      const result = await service.create(1, {
        prId: 1, vendorId: 1,
        expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 1000 }],
      });
      expect(result.status).toBe(PoStatus.DRAFT);
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    // Minor #1: คูณ quantity × unitPrice ต้องใช้ decimal ไม่ใช่ float
    // 1.03 × 1.5 = 1.545 → ปัดครึ่งขึ้น = 1.55 (float .toFixed(2) ได้ 1.54)
    it('should compute item total with decimal precision (1.03 × 1.5 = 1.55)', async () => {
      mockPrRepo.findOne.mockResolvedValue(mockApprovedPr);
      mockPoRepo.findOne.mockResolvedValue(null);
      mockVendorRepo.findOne.mockResolvedValue(mockVendor);
      mockPoRepo.count.mockResolvedValue(0);
      mockPoItemRepo.create.mockImplementation((e) => e);
      mockPoRepo.create.mockImplementation((e) => e);
      mockTxSave(jest.fn().mockImplementation((_entity, e) => Promise.resolve(e)));

      const result = await service.create(1, {
        prId: 1, vendorId: 1,
        expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'X', quantity: 1.03, unit: 'unit', unitPrice: 1.5 }],
      });

      expect(result.items[0].totalPrice).toBe(1.55);
      expect(result.totalAmount).toBe(1.55);
    });

    // P5-6: PO ที่แพงกว่า PR estimate ต้อง reserve ส่วนต่างเพิ่ม (delta บวก) เพื่อกัน used ทะลุ total ตอน consume
    it('should reserve the positive delta when PO total exceeds PR estimate', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockApprovedPr, totalEstimatedAmount: 1000 });
      mockPoRepo.findOne.mockResolvedValue(null);
      mockVendorRepo.findOne.mockResolvedValue(mockVendor);
      const item = { itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 1500, totalPrice: 1500, receivedQuantity: 0 };
      mockPoItemRepo.create.mockReturnValue(item);
      const createdPo = { ...mockDraftPo, items: [item], totalAmount: 1500 };
      mockPoRepo.create.mockReturnValue(createdPo);
      const manager = mockTxSave(jest.fn().mockResolvedValue(createdPo));

      await service.create(1, {
        prId: 1, vendorId: 1, expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 1500 }],
      });

      // delta = 1500 - 1000 = 500 (reserve เพิ่ม) ใช้ dept/fy/quarter ที่ตรึงจาก PR
      expect(mockBudgetsService.adjustReservedAmount).toHaveBeenCalledWith(1, 2026, null, 500, manager);
    });

    // P5-6: ถ้า PO เกินงบคงเหลือ adjustReservedAmount โยน BadRequest → ไม่สร้าง PO (rollback)
    it('should reject PO creation when PO total exceeds available budget', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockApprovedPr, totalEstimatedAmount: 1000 });
      mockPoRepo.findOne.mockResolvedValue(null);
      mockVendorRepo.findOne.mockResolvedValue(mockVendor);
      const item = { itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 999999, totalPrice: 999999, receivedQuantity: 0 };
      mockPoItemRepo.create.mockReturnValue(item);
      mockPoRepo.create.mockReturnValue({ ...mockDraftPo, items: [item], totalAmount: 999999 });
      const save = jest.fn().mockResolvedValue({ ...mockDraftPo });
      mockTxSave(save);
      mockBudgetsService.adjustReservedAmount.mockRejectedValueOnce(new BadRequestException('งบไม่พอ'));

      await expect(service.create(1, {
        prId: 1, vendorId: 1, expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 999999 }],
      })).rejects.toThrow(BadRequestException);
      expect(save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if po_number collides (23505) instead of leaking 500', async () => {
      mockPrRepo.findOne.mockResolvedValue(mockApprovedPr);
      mockPoRepo.findOne.mockResolvedValue(null);
      mockVendorRepo.findOne.mockResolvedValue(mockVendor);
      mockPoRepo.count.mockResolvedValue(0);
      mockPoItemRepo.create.mockReturnValue({ itemName: 'Item', quantity: 1, unitPrice: 1000, totalPrice: 1000 });
      mockPoRepo.create.mockReturnValue({ ...mockDraftPo });
      const dbErr = new QueryFailedError('insert', [], new Error('dup'));
      (dbErr as { code?: string }).code = '23505';
      mockTxSave(jest.fn().mockRejectedValue(dbErr));

      await expect(service.create(1, {
        prId: 1, vendorId: 1, expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 1000 }],
      })).rejects.toThrow(ConflictException);
    });

    it('should map active-PO unique violation (P4-2 race) to a clear ConflictException', async () => {
      mockPrRepo.findOne.mockResolvedValue(mockApprovedPr);
      mockPoRepo.findOne.mockResolvedValue(null); // app-level check ผ่าน (race) แต่ DB index จับได้
      mockVendorRepo.findOne.mockResolvedValue(mockVendor);
      mockPoRepo.count.mockResolvedValue(0);
      mockPoItemRepo.create.mockReturnValue({ itemName: 'Item', quantity: 1, unitPrice: 1000, totalPrice: 1000 });
      mockPoRepo.create.mockReturnValue({ ...mockDraftPo });
      const dbErr = new QueryFailedError('insert', [], new Error('dup'));
      (dbErr as { code?: string }).code = '23505';
      (dbErr as { constraint?: string }).constraint = 'UQ_active_po_per_pr';
      mockTxSave(jest.fn().mockRejectedValue(dbErr));

      await expect(service.create(1, {
        prId: 1, vendorId: 1, expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 1000 }],
      })).rejects.toThrow(/already has an active PO/);
    });

    it('should throw BadRequestException if PR is not approved', async () => {
      mockPrRepo.findOne.mockResolvedValue({ ...mockApprovedPr, status: PrStatus.SUBMITTED });
      await expect(service.create(1, {
        prId: 1, vendorId: 1, expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }],
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if vendor is blacklisted', async () => {
      mockPrRepo.findOne.mockResolvedValue(mockApprovedPr);
      mockPoRepo.findOne.mockResolvedValue(null);
      mockVendorRepo.findOne.mockResolvedValue({ ...mockVendor, isBlacklisted: true });
      await expect(service.create(1, {
        prId: 1, vendorId: 1, expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }],
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if PR already has an active PO (P4-2)', async () => {
      mockPrRepo.findOne.mockResolvedValue(mockApprovedPr);
      mockPoRepo.findOne.mockResolvedValue({ ...mockDraftPo }); // active PO ผูกกับ PR นี้อยู่แล้ว
      await expect(service.create(1, {
        prId: 1, vendorId: 1, expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }],
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('send', () => {
    it('should transition draft PO to sent', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockDraftPo });
      mockPoRepo.save.mockResolvedValue({ ...mockDraftPo, status: PoStatus.SENT });
      const result = await service.send(1);
      expect(result.status).toBe(PoStatus.SENT);
    });

    it('should throw BadRequest if PO is not draft', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockSentPo });
      await expect(service.send(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('acknowledge', () => {
    it('should transition sent PO to acknowledged', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockSentPo });
      const manager = { save: jest.fn().mockResolvedValue({ ...mockSentPo, status: PoStatus.ACKNOWLEDGED }) };
      mockDataSource.transaction.mockImplementation(async (cb: (m: typeof manager) => unknown) => cb(manager));
      const result = await service.acknowledge(1, 1);
      expect(result.status).toBe(PoStatus.ACKNOWLEDGED);
      // mutation-proof: status-save joins the tx (manager.save), not the bare repo
      expect(manager.save).toHaveBeenCalledWith(PurchaseOrder, expect.objectContaining({ status: PoStatus.ACKNOWLEDGED }));
    });

    it('should throw BadRequest if PO is not sent', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockDraftPo });
      await expect(service.acknowledge(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel a draft PO', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockDraftPo });
      const manager = { save: jest.fn().mockResolvedValue({ ...mockDraftPo, status: PoStatus.CANCELLED }) };
      mockDataSource.transaction.mockImplementation(async (cb: (m: typeof manager) => unknown) => cb(manager));
      const result = await service.cancel(1, 1);
      expect(result.status).toBe(PoStatus.CANCELLED);
      // mutation-proof: status-save joins the tx (manager.save), not the bare repo
      expect(manager.save).toHaveBeenCalledWith(PurchaseOrder, expect.objectContaining({ status: PoStatus.CANCELLED }));
    });

    it('should throw BadRequest if PO is already completed', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockCompletedPo });
      await expect(service.cancel(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest if PO is already cancelled', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockDraftPo, status: PoStatus.CANCELLED });
      await expect(service.cancel(1, 1)).rejects.toThrow(BadRequestException);
    });

    // P5-2/P5-6: release ยอด PO จริง (reserved สะท้อน PO total หลังสร้าง PO) ไม่ใช่ PR estimate
    it('P5-2: should release the PO total from reserved budget when cancelling a PO of an approved PR', async () => {
      mockPoRepo.findOne.mockResolvedValue({ id: 1, prId: 1, status: PoStatus.SENT, totalAmount: 60000 });
      const manager = { save: jest.fn().mockResolvedValue({ id: 1, status: PoStatus.CANCELLED }) };
      mockDataSource.transaction.mockImplementation(async (cb: (m: typeof manager) => unknown) => cb(manager));
      mockPrRepo.findOne.mockResolvedValue({
        id: 1, departmentId: 1, fiscalYear: 2026, quarter: null, totalEstimatedAmount: 50000, status: PrStatus.APPROVED,
      });

      await service.cancel(1, 1);
      // รอ fire-and-forget IIFE ปล่อย microtask
      await new Promise((r) => setImmediate(r));

      expect(mockBudgetsService.releaseReservedAmount).toHaveBeenCalledWith(1, 2026, null, 60000);
    });
  });

  describe('rateVendor', () => {
    it('should create rating for completed PO', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockCompletedPo });
      mockRatingRepo.findOne.mockResolvedValue(null);
      const mockRating = { id: 1, score: 4, poId: 1, vendorId: 1 };
      mockRatingRepo.create.mockReturnValue(mockRating);
      mockRatingRepo.save.mockResolvedValue(mockRating);
      const mockQb = { select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getRawOne: jest.fn().mockResolvedValue({ avg: '4.00' }) };
      mockRatingRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.rateVendor(1, 1, { score: 4 });
      expect(result.score).toBe(4);
      expect(mockVendorRepo.update).toHaveBeenCalledWith(1, { ratingAvg: 4 });
    });

    it('should throw BadRequest if PO is not completed', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockAckedPo });
      await expect(service.rateVendor(1, 1, { score: 4 })).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if PO already rated', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockCompletedPo });
      mockRatingRepo.findOne.mockResolvedValue({ id: 1 });
      await expect(service.rateVendor(1, 1, { score: 5 })).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should delete and recreate items inside a single transaction (atomic)', async () => {
      const manager = {
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn().mockImplementation((_e: unknown, data: unknown) => data),
        save: jest.fn().mockImplementation((_e: unknown, data: unknown) => Promise.resolve(data)),
      };
      mockPoRepo.findOne.mockResolvedValue({ ...mockDraftPo, items: [{ id: 9 }] });
      mockDataSource.transaction.mockImplementation(async (cb: (m: typeof manager) => unknown) => cb(manager));

      const result = await service.update(1, {
        items: [
          { itemName: 'A', quantity: 2, unit: 'pcs', unitPrice: 100 },
          { itemName: 'B', quantity: 1, unit: 'pcs', unitPrice: 50 },
        ],
      });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(manager.delete).toHaveBeenCalledWith(PurchaseOrderItem, { poId: 1 });
      // destructive delete + recreate must run through the transaction manager, never the bare repo
      expect(mockPoItemRepo.delete).not.toHaveBeenCalled();
      expect(result.totalAmount).toBe(250);
    });

    it('should throw BadRequest if PO is not draft', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockSentPo });
      await expect(service.update(1, { notes: 'x' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    // chainable qb mock: every builder method returns `this`; getManyAndCount resolves [[], 0]
    const makeQb = () => {
      const qb: Record<string, jest.Mock> = {};
      for (const m of ['leftJoinAndSelect', 'andWhere', 'orderBy', 'skip', 'take']) {
        qb[m] = jest.fn().mockReturnValue(qb);
      }
      qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      return qb;
    };

    it('should restrict to acknowledged + partially_received when receivable=true', async () => {
      const qb = makeQb();
      mockPoRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ receivable: true });

      expect(qb.andWhere).toHaveBeenCalledWith('po.status IN (:...receivable)', {
        receivable: [PoStatus.ACKNOWLEDGED, PoStatus.PARTIALLY_RECEIVED],
      });
    });

    it('should NOT add the receivable filter when the flag is absent', async () => {
      const qb = makeQb();
      mockPoRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({});

      const calledWithReceivable = qb.andWhere.mock.calls.some(
        (c: unknown[]) => c[0] === 'po.status IN (:...receivable)',
      );
      expect(calledWithReceivable).toBe(false);
    });
  });
});
