import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

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
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
    mockRepo.find.mockResolvedValue([mockUser]);
  });

  it('findAll returns all users', async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
  });

  it('updateRole throws NotFoundException when user not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(
      service.updateRole(999, { role: UserRole.MANAGER }),
    ).rejects.toThrow(NotFoundException);
  });

  it('updateRole updates role successfully', async () => {
    mockRepo.findOne.mockResolvedValue({ ...mockUser });
    mockRepo.save.mockResolvedValue({ ...mockUser, role: UserRole.MANAGER });

    const result = await service.updateRole(1, { role: UserRole.MANAGER });
    expect(result.role).toBe(UserRole.MANAGER);
  });
});
