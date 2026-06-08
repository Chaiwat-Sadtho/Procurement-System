import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { CacheService } from '../cache/cache.service';
import * as bcrypt from 'bcrypt';

const mockUser: User = {
  id: 1,
  email: 'test@test.com',
  passwordHash: 'hashedPassword',
  firstName: 'Test',
  middleName: null,
  lastName: 'User',
  fullName: 'Test User',
  role: UserRole.EMPLOYEE,
  isActive: true,
  departmentId: 1,
  department: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

const mockCache = {
  getOrSet: jest.fn(async (_key: string, _ttl: number, factory: () => unknown) => await factory()),
  del: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('mock-jwt-token');
  });

  describe('register', () => {
    it('should create user and return token', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
        departmentId: 1,
      });

      expect(result).toHaveProperty('access_token');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@test.com',
          password: 'password123',
        } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequest when departmentId missing', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(
        service.register({
          email: 'x@test.com',
          password: 'password123',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should return token when credentials are valid', async () => {
      const userWithHash = {
        ...mockUser,
        passwordHash: await bcrypt.hash('password123', 10),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(userWithHash),
      });

      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('access_token');
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const userWithHash = {
        ...mockUser,
        passwordHash: await bcrypt.hash('correctPass', 10),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(userWithHash),
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrongPass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.login({ email: 'notexist@test.com', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when account is deactivated', async () => {
      const inactiveUser = {
        ...mockUser,
        isActive: false,
        passwordHash: await bcrypt.hash('password123', 10),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(inactiveUser),
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return full user with department relation', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      // re-hydrated into a real User (carries the fullName getter), content preserved
      expect(result).toBeInstanceOf(User);
      expect(result.email).toBe(mockUser.email);
      expect(result.fullName).toBe('Test User');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { department: true },
      });
    });

    it('should throw UnauthorizedException when user no longer exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(UnauthorizedException);
    });

    it('caches the profile under auth:me:{id} with the auth TTL', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await service.getProfile(7);

      expect(mockCache.getOrSet).toHaveBeenCalledWith('auth:me:7', 300, expect.any(Function));
    });

    it('rehydrates a JSON-round-tripped cache hit into a User so fullName survives', async () => {
      // A Redis hit returns a plain object (Keyv serializes to JSON → the fullName
      // getter and the User prototype are gone). getProfile must rebuild the instance
      // so ClassSerializerInterceptor still emits fullName.
      const cachedPlain = {
        id: 7,
        email: 'c@d.com',
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Doe',
        role: UserRole.EMPLOYEE,
        isActive: true,
        departmentId: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      mockCache.getOrSet.mockResolvedValueOnce(cachedPlain); // simulate hit (factory not run)

      const result = await service.getProfile(7);

      expect(result).toBeInstanceOf(User);
      expect(result.fullName).toBe('John Michael Doe');
    });
  });

  describe('updateProfile', () => {
    it('should update only provided name fields and return refreshed profile', async () => {
      const editable = { ...mockUser };
      mockUserRepository.findOne
        .mockResolvedValueOnce(editable)
        .mockResolvedValueOnce({ ...editable, middleName: 'Mid' });
      mockUserRepository.save.mockResolvedValue(editable);

      const result = await service.updateProfile(1, { middleName: 'Mid' });

      expect(editable.middleName).toBe('Mid');
      expect(editable.firstName).toBe('Test');
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('middleName', 'Mid');
    });

    it('should set middleName to null when passed null', async () => {
      const editable = { ...mockUser, middleName: 'Old' };
      mockUserRepository.findOne
        .mockResolvedValueOnce(editable)
        .mockResolvedValueOnce({ ...editable, middleName: null });
      mockUserRepository.save.mockResolvedValue(editable);

      await service.updateProfile(1, { middleName: null as unknown as string });

      expect(editable.middleName).toBeNull();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile(999, { firstName: 'X' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('invalidates the auth:me cache on profile update', async () => {
      const editable = { ...mockUser };
      mockUserRepository.findOne.mockResolvedValueOnce(editable).mockResolvedValueOnce(editable);
      mockUserRepository.save.mockResolvedValue(editable);

      await service.updateProfile(7, { firstName: 'New' });

      expect(mockCache.del).toHaveBeenCalledWith('auth:me:7');
    });

    it('invalidates auth:me BEFORE re-reading the profile (del precedes the re-read)', async () => {
      // guards the del-then-getProfile order: re-reading first would re-cache stale data
      const calls: string[] = [];
      mockCache.del.mockImplementationOnce(() => {
        calls.push('del');
      });
      mockCache.getOrSet.mockImplementationOnce(
        async (_k: string, _t: number, f: () => unknown) => {
          calls.push('getOrSet');
          return await f();
        },
      );
      const editable = { ...mockUser, id: 7 };
      mockUserRepository.findOne.mockResolvedValueOnce(editable).mockResolvedValueOnce(editable);
      mockUserRepository.save.mockResolvedValue(editable);

      await service.updateProfile(7, { firstName: 'New' });

      expect(calls).toEqual(['del', 'getOrSet']);
    });
  });
});
