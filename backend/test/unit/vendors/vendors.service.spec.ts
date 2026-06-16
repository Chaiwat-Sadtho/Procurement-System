import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { VendorsService } from '@app/vendors/vendors.service';
import { Vendor } from '@app/vendors/entities/vendor.entity';
import { VendorCategory } from '@app/vendors/entities/vendor-category.entity';
import { VendorRating } from '@app/vendors/entities/vendor-rating.entity';
import { CacheService } from '@app/cache/cache.service';

const mockVendor: Partial<Vendor> = {
  id: 1,
  name: 'บริษัท ไอทีซัพพลาย จำกัด',
  taxId: '0105563123456',
  isBlacklisted: false,
  blacklistReason: null,
  categories: [],
};

const mockBlacklistedVendor: Partial<Vendor> = {
  ...mockVendor,
  isBlacklisted: true,
  blacklistReason: 'ส่งของไม่ตรงสเปค',
};

const mockVendorListQb = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
};

const mockVendorRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => mockVendorListQb),
};

const mockCache = {
  getOrSetNamespaced: jest.fn((_ns: string, _sub: string, _ttl: number, factory: () => unknown) =>
    factory(),
  ),
  invalidateNamespace: jest.fn(),
};

const mockCategoryRepo = {
  findBy: jest.fn().mockResolvedValue([]),
};

const mockRatingQb = {
  leftJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
};
const mockRatingRepo = {
  createQueryBuilder: jest.fn(() => mockRatingQb),
  count: jest.fn(),
};

describe('VendorsService', () => {
  let service: VendorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: getRepositoryToken(Vendor), useValue: mockVendorRepo },
        {
          provide: getRepositoryToken(VendorCategory),
          useValue: mockCategoryRepo,
        },
        { provide: getRepositoryToken(VendorRating), useValue: mockRatingRepo },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();
    service = module.get<VendorsService>(VendorsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create vendor successfully', async () => {
      mockVendorRepo.findOne.mockResolvedValue(null);
      mockVendorRepo.create.mockReturnValue(mockVendor);
      mockVendorRepo.save.mockResolvedValue(mockVendor);

      const result = await service.create({
        name: 'บริษัท ไอทีซัพพลาย จำกัด',
        taxId: '0105563123456',
      });

      expect(result.name).toBe('บริษัท ไอทีซัพพลาย จำกัด');
      expect(mockVendorRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if taxId already exists', async () => {
      mockVendorRepo.findOne.mockResolvedValue(mockVendor);
      await expect(service.create({ name: 'อีกบริษัท', taxId: '0105563123456' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if vendor not found', async () => {
      mockVendorRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should return vendor when found', async () => {
      mockVendorRepo.findOne.mockResolvedValue({ ...mockVendor });
      const result = await service.findOne(1);
      expect(result.id).toBe(1);
    });
  });

  describe('blacklist', () => {
    it('should blacklist a vendor with reason', async () => {
      mockVendorRepo.findOne.mockResolvedValue({ ...mockVendor });
      mockVendorRepo.save.mockResolvedValue({
        ...mockVendor,
        isBlacklisted: true,
        blacklistReason: 'ส่งของไม่ตรงสเปค',
      });

      const result = await service.blacklist(1, { reason: 'ส่งของไม่ตรงสเปค' });
      expect(result.isBlacklisted).toBe(true);
      expect(result.blacklistReason).toBe('ส่งของไม่ตรงสเปค');
    });

    it('should throw BadRequestException if vendor is already blacklisted', async () => {
      mockVendorRepo.findOne.mockResolvedValue({ ...mockBlacklistedVendor });
      await expect(service.blacklist(1, { reason: 'เหตุผลใหม่' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if vendor not found', async () => {
      mockVendorRepo.findOne.mockResolvedValue(null);
      await expect(service.blacklist(999, { reason: 'เหตุผล' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('unblacklist', () => {
    it('should remove vendor from blacklist', async () => {
      mockVendorRepo.findOne.mockResolvedValue({ ...mockBlacklistedVendor });
      mockVendorRepo.save.mockResolvedValue({
        ...mockBlacklistedVendor,
        isBlacklisted: false,
        blacklistReason: null,
      });

      const result = await service.unblacklist(1);
      expect(result.isBlacklisted).toBe(false);
      expect(result.blacklistReason).toBeNull();
    });

    it('should throw BadRequestException if vendor is not blacklisted', async () => {
      mockVendorRepo.findOne.mockResolvedValue({ ...mockVendor });
      await expect(service.unblacklist(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findRatings', () => {
    it('should throw NotFoundException if vendor not found', async () => {
      mockVendorRepo.findOne.mockResolvedValue(null);
      await expect(service.findRatings(999, { page: 1, limit: 20 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return paginated ratings with joined PO number and rater name', async () => {
      mockVendorRepo.findOne.mockResolvedValue({ ...mockVendor });
      mockRatingQb.getRawMany.mockResolvedValue([
        {
          id: 1,
          vendorId: 1,
          poId: 5,
          score: 4,
          comment: 'ส่งตรงเวลา',
          createdAt: new Date('2025-01-10T00:00:00Z'),
          poNumber: 'PO-2025-0005',
          raterId: 3,
          raterFirstName: 'วิชัย',
          raterMiddleName: 'ก.',
          raterLastName: 'จัดซื้อ',
        },
      ]);
      mockRatingRepo.count.mockResolvedValue(1);

      const result = await service.findRatings(1, { page: 1, limit: 20 });

      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(result.data[0]).toEqual({
        id: 1,
        vendorId: 1,
        poId: 5,
        purchaseOrder: { id: 5, poNumber: 'PO-2025-0005' },
        score: 4,
        comment: 'ส่งตรงเวลา',
        ratedBy: { id: 3, fullName: 'วิชัย ก. จัดซื้อ' },
        createdAt: new Date('2025-01-10T00:00:00Z'),
      });
    });
  });

  describe('caching (Phase 8 G3)', () => {
    it('findAll caches under vendor:list namespace keyed by query hash', async () => {
      await service.findAll({ page: 1, limit: 10, isBlacklisted: false });
      expect(mockCache.getOrSetNamespaced).toHaveBeenCalledWith(
        'vendor:list',
        expect.any(String),
        120,
        expect.any(Function),
      );
    });

    it('findRatings caches under vendor:ratings:{id} namespace', async () => {
      mockVendorRepo.findOne.mockResolvedValue({ ...mockVendor });
      mockRatingQb.getRawMany.mockResolvedValue([]);
      mockRatingRepo.count.mockResolvedValue(0);
      await service.findRatings(5, { page: 1, limit: 10 });
      expect(mockCache.getOrSetNamespaced).toHaveBeenCalledWith(
        'vendor:ratings:5',
        expect.any(String),
        120,
        expect.any(Function),
      );
    });

    it('create invalidates vendor:list namespace', async () => {
      mockVendorRepo.findOne.mockResolvedValue(null);
      mockVendorRepo.create.mockReturnValue({ ...mockVendor });
      mockVendorRepo.save.mockResolvedValue({ ...mockVendor });
      await service.create({ name: 'V' });
      expect(mockCache.invalidateNamespace).toHaveBeenCalledWith('vendor:list');
    });

    it('update invalidates vendor:list namespace', async () => {
      mockVendorRepo.findOne.mockResolvedValue({ ...mockVendor });
      mockVendorRepo.save.mockResolvedValue({ ...mockVendor });
      await service.update(1, { name: 'New' });
      expect(mockCache.invalidateNamespace).toHaveBeenCalledWith('vendor:list');
    });

    it('blacklist invalidates vendor:list namespace', async () => {
      mockVendorRepo.findOne.mockResolvedValue({ ...mockVendor });
      mockVendorRepo.save.mockResolvedValue({ ...mockVendor, isBlacklisted: true });
      await service.blacklist(1, { reason: 'ส่งของไม่ตรงสเปค' });
      expect(mockCache.invalidateNamespace).toHaveBeenCalledWith('vendor:list');
    });

    it('unblacklist invalidates vendor:list namespace', async () => {
      mockVendorRepo.findOne.mockResolvedValue({ ...mockBlacklistedVendor });
      mockVendorRepo.save.mockResolvedValue({ ...mockBlacklistedVendor, isBlacklisted: false });
      await service.unblacklist(1);
      expect(mockCache.invalidateNamespace).toHaveBeenCalledWith('vendor:list');
    });
  });
});
