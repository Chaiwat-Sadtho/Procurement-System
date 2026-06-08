import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { VendorCategoriesService } from './vendor-categories.service';
import { VendorCategory } from './entities/vendor-category.entity';
import { CacheService } from '../cache/cache.service';

const mockCategory = { id: 1, name: 'IT Equipment' };

const mockCategoryRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn().mockResolvedValue([mockCategory]),
};

const mockCache = {
  getOrSet: jest.fn((_key: string, _ttl: number, factory: () => unknown) => factory()),
  del: jest.fn(),
};

describe('VendorCategoriesService', () => {
  let service: VendorCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorCategoriesService,
        {
          provide: getRepositoryToken(VendorCategory),
          useValue: mockCategoryRepo,
        },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();
    service = module.get<VendorCategoriesService>(VendorCategoriesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create category successfully', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);
      mockCategoryRepo.create.mockReturnValue(mockCategory);
      mockCategoryRepo.save.mockResolvedValue(mockCategory);

      const result = await service.create({ name: 'IT Equipment' });
      expect(result.name).toBe('IT Equipment');
      expect(mockCategoryRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if name already exists', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(mockCategory);
      await expect(service.create({ name: 'IT Equipment' })).rejects.toThrow(ConflictException);
    });

    it('invalidates the vendor-categories cache after creating', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);
      mockCategoryRepo.create.mockReturnValue(mockCategory);
      mockCategoryRepo.save.mockResolvedValue(mockCategory);

      await service.create({ name: 'IT Equipment' });

      expect(mockCache.del).toHaveBeenCalledWith('ref:vendor-categories');
    });
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('IT Equipment');
    });

    it('caches the result under ref:vendor-categories with the reference TTL', async () => {
      await service.findAll();
      expect(mockCache.getOrSet).toHaveBeenCalledWith(
        'ref:vendor-categories',
        3600,
        expect.any(Function),
      );
    });
  });
});
