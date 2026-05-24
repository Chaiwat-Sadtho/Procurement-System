import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrder, PoStatus } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PurchaseRequest, PrStatus } from '../purchase-requests/entities/purchase-request.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { VendorRating } from '../vendors/entities/vendor-rating.entity';

const mockApprovedPr: Partial<PurchaseRequest> = {
  id: 1, status: PrStatus.APPROVED,
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
      ],
    }).compile();
    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create PO from approved PR with non-blacklisted vendor', async () => {
      mockPrRepo.findOne.mockResolvedValue(mockApprovedPr);
      mockPoRepo.findOne.mockResolvedValue(null); // P4-2: ยังไม่มี active PO ผูกกับ PR นี้
      mockVendorRepo.findOne.mockResolvedValue(mockVendor);
      mockPoRepo.count.mockResolvedValue(0);
      const item = { itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 1000, totalPrice: 1000, receivedQuantity: 0 };
      mockPoItemRepo.create.mockReturnValue(item);
      const createdPo = { ...mockDraftPo, items: [item], totalAmount: 1000 };
      mockPoRepo.create.mockReturnValue(createdPo);
      mockPoRepo.save.mockResolvedValue(createdPo);

      const result = await service.create(1, {
        prId: 1, vendorId: 1,
        expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 1000 }],
      });
      expect(result.status).toBe(PoStatus.DRAFT);
      expect(mockPoRepo.save).toHaveBeenCalled();
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
      mockPoRepo.save.mockResolvedValue({ ...mockSentPo, status: PoStatus.ACKNOWLEDGED });
      const result = await service.acknowledge(1);
      expect(result.status).toBe(PoStatus.ACKNOWLEDGED);
    });

    it('should throw BadRequest if PO is not sent', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockDraftPo });
      await expect(service.acknowledge(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel a draft PO', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockDraftPo });
      mockPoRepo.save.mockResolvedValue({ ...mockDraftPo, status: PoStatus.CANCELLED });
      const result = await service.cancel(1);
      expect(result.status).toBe(PoStatus.CANCELLED);
    });

    it('should throw BadRequest if PO is already completed', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockCompletedPo });
      await expect(service.cancel(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest if PO is already cancelled', async () => {
      mockPoRepo.findOne.mockResolvedValue({ ...mockDraftPo, status: PoStatus.CANCELLED });
      await expect(service.cancel(1)).rejects.toThrow(BadRequestException);
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
});
