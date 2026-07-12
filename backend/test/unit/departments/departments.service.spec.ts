import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { DepartmentsService } from '@app/departments/departments.service';
import { Department } from '@app/departments/entities/department.entity';
import { CacheService } from '@app/cache/cache.service';

const mockDepartment = { id: 1, name: 'Finance' };

const mockDepartmentRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn().mockResolvedValue([mockDepartment]),
};

const mockCache = {
  getOrSet: jest.fn((_key: string, _ttl: number, factory: () => unknown) => factory()),
  del: jest.fn(),
};

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: getRepositoryToken(Department), useValue: mockDepartmentRepo },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();
    service = module.get<DepartmentsService>(DepartmentsService);
    jest.clearAllMocks();
    mockDepartmentRepo.find.mockResolvedValue([mockDepartment]);
  });

  describe('create', () => {
    it('should create a department successfully', async () => {
      mockDepartmentRepo.findOne.mockResolvedValue(null);
      mockDepartmentRepo.create.mockReturnValue(mockDepartment);
      mockDepartmentRepo.save.mockResolvedValue(mockDepartment);

      const result = await service.create({ name: 'Finance' });
      expect(result.name).toBe('Finance');
      expect(mockDepartmentRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if name already exists', async () => {
      mockDepartmentRepo.findOne.mockResolvedValue(mockDepartment);
      await expect(service.create({ name: 'Finance' })).rejects.toThrow(ConflictException);
    });

    it('translates a unique-violation race (23505) into ConflictException', async () => {
      // app-level findOne check passes (concurrent insert) but the DB unique index rejects
      // the second write — surface it as a clean 409, not a raw 500.
      mockDepartmentRepo.findOne.mockResolvedValue(null);
      mockDepartmentRepo.create.mockReturnValue(mockDepartment);
      const dbErr = new QueryFailedError('insert', [], new Error('dup'));
      (dbErr as { code?: string }).code = '23505';
      mockDepartmentRepo.save.mockRejectedValue(dbErr);

      await expect(service.create({ name: 'Finance' })).rejects.toThrow(ConflictException);
    });

    it('invalidates the departments cache after creating', async () => {
      mockDepartmentRepo.findOne.mockResolvedValue(null);
      mockDepartmentRepo.create.mockReturnValue(mockDepartment);
      mockDepartmentRepo.save.mockResolvedValue(mockDepartment);

      await service.create({ name: 'Finance' });

      expect(mockCache.del).toHaveBeenCalledWith('ref:departments');
    });
  });

  describe('findAll', () => {
    it('should return all departments', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Finance');
    });

    it('caches the result under ref:departments with the reference TTL', async () => {
      await service.findAll();
      expect(mockCache.getOrSet).toHaveBeenCalledWith(
        'ref:departments',
        3600,
        expect.any(Function),
      );
    });
  });
});
