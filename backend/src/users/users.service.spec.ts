import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { CacheService } from '../cache/cache.service';

const mockUser: Partial<User> = {
  id: 1,
  email: 'test@test.com',
  role: UserRole.EMPLOYEE,
  isActive: true,
};

const mockRepo = {
  find: jest.fn().mockResolvedValue([mockUser]),
  findOne: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
};

const mockCache = {
  del: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
    mockRepo.find.mockResolvedValue([mockUser]);
  });

  it('updateRole throws NotFoundException when user not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.updateRole(999, { role: UserRole.MANAGER }, 1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateRole updates role successfully', async () => {
    mockRepo.findOne.mockResolvedValue({ ...mockUser });
    mockRepo.save.mockResolvedValue({ ...mockUser, role: UserRole.MANAGER });

    const result = await service.updateRole(1, { role: UserRole.MANAGER }, 999);
    expect(result.role).toBe(UserRole.MANAGER);
  });

  it('updateRole forbids changing your own role', async () => {
    mockRepo.findOne.mockResolvedValue({ ...mockUser, id: 5 });
    await expect(service.updateRole(5, { role: UserRole.MANAGER }, 5)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('updateRole blocks demoting the last active procurement officer', async () => {
    mockRepo.findOne.mockResolvedValue({
      ...mockUser,
      id: 2,
      role: UserRole.PROCUREMENT_OFFICER,
    });
    mockRepo.count.mockResolvedValue(1);
    await expect(service.updateRole(2, { role: UserRole.EMPLOYEE }, 999)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('updateStatus forbids deactivating yourself', async () => {
    mockRepo.findOne.mockResolvedValue({ ...mockUser, id: 5 });
    await expect(service.updateStatus(5, { isActive: false }, 5)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('updateStatus blocks deactivating the last active procurement officer', async () => {
    mockRepo.findOne.mockResolvedValue({
      ...mockUser,
      id: 2,
      role: UserRole.PROCUREMENT_OFFICER,
      isActive: true,
    });
    mockRepo.count.mockResolvedValue(1);
    await expect(service.updateStatus(2, { isActive: false }, 999)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('updateRole invalidates the target user auth:me cache', async () => {
    mockRepo.findOne.mockResolvedValue({ ...mockUser, id: 7 });
    mockRepo.save.mockResolvedValue({ ...mockUser, id: 7, role: UserRole.MANAGER });

    await service.updateRole(7, { role: UserRole.MANAGER }, 1);

    expect(mockCache.del).toHaveBeenCalledWith('auth:me:7');
  });

  it('updateStatus invalidates the target user auth:me cache', async () => {
    mockRepo.findOne.mockResolvedValue({ ...mockUser, id: 7 });
    mockRepo.save.mockResolvedValue({ ...mockUser, id: 7, isActive: false });

    await service.updateStatus(7, { isActive: false }, 1);

    expect(mockCache.del).toHaveBeenCalledWith('auth:me:7');
  });

  describe('findAll role-aware', () => {
    it('PO sees all users', async () => {
      mockRepo.find.mockResolvedValue([
        { id: 1, departmentId: 1 },
        { id: 2, departmentId: 2 },
      ]);

      const result = await service.findAll({
        role: UserRole.PROCUREMENT_OFFICER,
        departmentId: null,
      });

      expect(result).toHaveLength(2);
      expect(mockRepo.find).toHaveBeenCalledWith({
        relations: { department: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('Manager sees only users in same department', async () => {
      mockRepo.find.mockResolvedValue([{ id: 1, departmentId: 1 }]);

      const result = await service.findAll({
        role: UserRole.MANAGER,
        departmentId: 1,
      });

      expect(result).toHaveLength(1);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { departmentId: 1 },
        relations: { department: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('Manager without departmentId throws ForbiddenException', async () => {
      await expect(service.findAll({ role: UserRole.MANAGER, departmentId: null })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('non-PO / non-Manager role (employee) throws ForbiddenException', async () => {
      await expect(service.findAll({ role: UserRole.EMPLOYEE, departmentId: 1 })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
