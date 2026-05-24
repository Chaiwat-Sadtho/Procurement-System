import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PurchaseRequest, PrStatus } from './entities/purchase-request.entity';
import { PurchaseRequestItem } from './entities/purchase-request-item.entity';
import { User, UserRole } from '../users/entities/user.entity';

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
