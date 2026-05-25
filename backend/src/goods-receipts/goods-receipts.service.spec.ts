import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceiptNote } from './entities/goods-receipt-note.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { PurchaseOrder, PoStatus } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../purchase-orders/entities/purchase-order-item.entity';
import { ItemCondition } from './entities/goods-receipt-item.entity';

const mockPoItem: Partial<PurchaseOrderItem> = {
  id: 1, quantity: 2, receivedQuantity: 0, itemName: 'Laptop',
};

const mockAcknowledgedPo: Partial<PurchaseOrder> = {
  id: 1, status: PoStatus.ACKNOWLEDGED,
  items: [mockPoItem as PurchaseOrderItem],
};

const mockPartialPo: Partial<PurchaseOrder> = {
  ...mockAcknowledgedPo, status: PoStatus.PARTIALLY_RECEIVED,
};

const mockGrn: Partial<GoodsReceiptNote> = {
  id: 1, grnNumber: 'GRN-2025-0001', poId: 1,
};

// mock สำหรับ transaction — เราต้องจำลอง DataSource.transaction()
const createMockEntityManager = (po: Partial<PurchaseOrder>) => ({
  findOne: jest.fn().mockImplementation((entity: any, opts: any) => {
    if (entity === PurchaseOrder) return Promise.resolve({ ...po });
    return Promise.resolve(null);
  }),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn().mockReturnValue(mockGrn),
  save: jest.fn().mockImplementation((entity, data) => Promise.resolve(data || mockGrn)),
});

const mockDataSource = {
  transaction: jest.fn(),
};

const mockGrnRepo = {
  createQueryBuilder: jest.fn(),
};

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
      ],
    }).compile();
    service = module.get<GoodsReceiptsService>(GoodsReceiptsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create GRN and set PO to partially_received when not all items received', async () => {
      const manager = createMockEntityManager(mockAcknowledgedPo);
      // po has 1 item with quantity=2, receiving only 1
      manager.findOne.mockImplementation((entity: any, opts: any) => {
        if (entity === PurchaseOrder) {
          return Promise.resolve({
            ...mockAcknowledgedPo,
            items: [{ id: 1, quantity: 2, receivedQuantity: 0 }],
          });
        }
        return Promise.resolve(null);
      });
      manager.save.mockResolvedValue(mockGrn);
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      const result = await service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 1, condition: ItemCondition.GOOD }],
      });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      // PO status should be partially_received (receivedQty 1 < quantity 2)
      const savedPoCalls = manager.save.mock.calls.filter((c: any) => c[0] === PurchaseOrder);
      expect(savedPoCalls[0][1].status).toBe(PoStatus.PARTIALLY_RECEIVED);
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
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 2, condition: ItemCondition.GOOD }],
      });

      const savedPoCalls = manager.save.mock.calls.filter((c: any) => c[0] === PurchaseOrder);
      expect(savedPoCalls[0][1].status).toBe(PoStatus.COMPLETED);
    });

    it('should throw BadRequest if PO is not in receivable status', async () => {
      const manager = createMockEntityManager({ ...mockAcknowledgedPo, status: PoStatus.DRAFT });
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

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
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      // PO item สั่ง 2 แต่รับ 5 → ต้องโยน BadRequest
      await expect(service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 5, condition: ItemCondition.GOOD }],
      })).rejects.toThrow(BadRequestException);
    });

    it('should scope GRN running number count to current year (yearly reset)', async () => {
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
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 1, condition: ItemCondition.GOOD }],
      });

      const year = new Date().getFullYear();
      const countArg = manager.count.mock.calls[0][1];
      expect(countArg.where.grnNumber.value).toBe(`GRN-${year}-%`);
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
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await expect(service.create(1, {
        poId: 1,
        receivedDate: '2025-11-15',
        items: [{ poItemId: 1, receivedQuantity: 1, condition: ItemCondition.GOOD }],
      })).rejects.toThrow(ConflictException);
    });
  });
});
