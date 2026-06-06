import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { Budget } from './entities/budget.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { NotificationsService } from '../notifications/notifications.service';

const mockBudget = {
  id: 1,
  departmentId: 1,
  fiscalYear: 2026,
  quarter: null,
  totalAmount: 1000000,
  reservedAmount: 0,
  usedAmount: 0,
};

const poUser = { id: 10, role: UserRole.PROCUREMENT_OFFICER };
const managerUser = { id: 20, role: UserRole.MANAGER };

const mockBudgetRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockUserRepo = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
};

const mockDepartmentRepo = {
  findOne: jest.fn(),
};

const mockDataSource = {
  manager: {
    findOne: jest.fn(),
    update: jest.fn(),
  },
};

const mockNotificationsService = {
  sendToMany: jest.fn().mockResolvedValue(undefined),
};

describe('BudgetsService', () => {
  let service: BudgetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: getRepositoryToken(Budget), useValue: mockBudgetRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(Department),
          useValue: mockDepartmentRepo,
        },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get<BudgetsService>(BudgetsService);
    jest.clearAllMocks();
    mockUserRepo.find.mockResolvedValue([]);
    mockUserRepo.findOne.mockResolvedValue(null);
    mockNotificationsService.sendToMany.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('should create a new annual budget', async () => {
      mockBudgetRepo.findOne.mockResolvedValue(null);
      mockBudgetRepo.create.mockReturnValue({ ...mockBudget });
      mockBudgetRepo.save.mockResolvedValue({ ...mockBudget });

      const result = await service.create({
        departmentId: 1,
        fiscalYear: 2026,
        totalAmount: 1000000,
      });

      expect(result.totalAmount).toBe(1000000);
      expect(mockBudgetRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if budget already exists', async () => {
      mockBudgetRepo.findOne.mockResolvedValue(mockBudget);
      await expect(
        service.create({
          departmentId: 1,
          fiscalYear: 2026,
          totalAmount: 1000000,
        }),
      ).rejects.toThrow(ConflictException);
    });

    // Review #2: under a race the findOne check passes (null) but the DB unique
    // constraint (incl. the annual partial index) rejects the insert with 23505.
    // create() must surface that as a ConflictException, not a raw QueryFailedError.
    it('should map a 23505 unique-violation on save to ConflictException', async () => {
      mockBudgetRepo.findOne.mockResolvedValue(null);
      mockBudgetRepo.create.mockReturnValue({ ...mockBudget });
      mockBudgetRepo.save.mockRejectedValue(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      await expect(
        service.create({
          departmentId: 1,
          fiscalYear: 2026,
          totalAmount: 1000000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('reserveAmount', () => {
    it('should increase reservedAmount successfully', async () => {
      mockDataSource.manager.findOne.mockResolvedValue({ ...mockBudget });
      mockDataSource.manager.update.mockResolvedValue({ affected: 1 });

      await service.reserveAmount(1, 2026, null, 200000);

      expect(mockDataSource.manager.update).toHaveBeenCalledWith(Budget, 1, {
        reservedAmount: 200000,
      });
    });

    it('should throw NotFoundException when no budget configured', async () => {
      mockDataSource.manager.findOne.mockResolvedValue(null);
      await expect(service.reserveAmount(1, 2026, null, 200000)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when exceeds available budget', async () => {
      // available = 1000000 - 900000 - 50000 = 50000, requesting 100000
      mockDataSource.manager.findOne.mockResolvedValue({
        ...mockBudget,
        reservedAmount: 900000,
        usedAmount: 50000,
      });
      await expect(service.reserveAmount(1, 2026, null, 100000)).rejects.toThrow(
        BadRequestException,
      );
    });

    // Minor #2: budget warning ต้องบอกชื่อแผนกในข้อความ (procurement officer รับแจ้งหลาย dept ต้องแยกออก)
    it('should include the department name in the warning notification', async () => {
      mockDataSource.manager.findOne.mockResolvedValue({ ...mockBudget });
      mockDataSource.manager.update.mockResolvedValue({ affected: 1 });
      mockDepartmentRepo.findOne.mockResolvedValue({
        id: 1,
        name: 'Engineering',
      });
      mockUserRepo.find.mockResolvedValue([{ id: 5 }]);

      // committed 850000/1000000 = 85% > 80% → trigger warning
      await service.reserveAmount(1, 2026, null, 850000);
      await new Promise((r) => setImmediate(r));

      expect(mockNotificationsService.sendToMany).toHaveBeenCalledWith(
        [5],
        expect.objectContaining({
          title: expect.stringContaining('Engineering') as unknown,
        }),
      );
    });

    // audit-durability #5 (notification observability): budget-warning is best-effort
    // and must not block the reserve, but a failed send must be logged, not swallowed.
    it('should log a warning (not throw) when the budget-warning notification fails', async () => {
      mockDataSource.manager.findOne.mockResolvedValue({ ...mockBudget });
      mockDataSource.manager.update.mockResolvedValue({ affected: 1 });
      mockDepartmentRepo.findOne.mockResolvedValue({
        id: 1,
        name: 'Engineering',
      });
      mockUserRepo.find.mockResolvedValue([{ id: 5 }]);
      mockNotificationsService.sendToMany.mockRejectedValue(new Error('notify down'));
      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      // committed 850000/1000000 = 85% > 80% → trigger warning; reserve must still succeed
      await expect(service.reserveAmount(1, 2026, null, 850000)).resolves.toBeUndefined();
      await new Promise((r) => setImmediate(r));

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    // P5-3: quarter เป็นเลข → where ต้อง match quarter ตรง ไม่ใช่ IsNull
    it('should query budget row matching the quarter when quarter is set', async () => {
      mockDataSource.manager.findOne.mockResolvedValue({
        ...mockBudget,
        quarter: 2,
      });
      mockDataSource.manager.update.mockResolvedValue({ affected: 1 });

      await service.reserveAmount(1, 2026, 2, 200000);

      expect(mockDataSource.manager.findOne).toHaveBeenCalledWith(
        Budget,
        expect.objectContaining({
          where: expect.objectContaining({
            departmentId: 1,
            fiscalYear: 2026,
            quarter: 2,
          }) as unknown,
        }),
      );
    });
  });

  describe('releaseReservedAmount', () => {
    it('should decrease reservedAmount via the default manager with a write lock', async () => {
      mockDataSource.manager.findOne.mockResolvedValue({
        ...mockBudget,
        reservedAmount: 200000,
      });
      mockDataSource.manager.update.mockResolvedValue({ affected: 1 });

      await service.releaseReservedAmount(1, 2026, null, 200000);

      expect(mockDataSource.manager.findOne).toHaveBeenCalledWith(
        Budget,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(mockDataSource.manager.update).toHaveBeenCalledWith(Budget, 1, {
        reservedAmount: 0,
      });
    });

    it('should clamp to 0 when releasing more than reserved', async () => {
      mockDataSource.manager.findOne.mockResolvedValue({
        ...mockBudget,
        reservedAmount: 50000,
      });
      mockDataSource.manager.update.mockResolvedValue({ affected: 1 });

      await service.releaseReservedAmount(1, 2026, null, 200000);

      expect(mockDataSource.manager.update).toHaveBeenCalledWith(Budget, 1, {
        reservedAmount: 0,
      });
    });

    it('should silently skip if no budget configured', async () => {
      mockDataSource.manager.findOne.mockResolvedValue(null);
      await expect(service.releaseReservedAmount(1, 2026, null, 200000)).resolves.toBeUndefined();
      expect(mockDataSource.manager.update).not.toHaveBeenCalled();
    });

    // atomicity: cancel ส่ง tx manager มา → release ต้องใช้ manager ตัวนั้น (ไม่ใช่ default) → join cancel tx
    it('should use the provided transaction manager (not the default) when one is passed', async () => {
      const txManager = {
        findOne: jest.fn().mockResolvedValue({ ...mockBudget, reservedAmount: 200000 }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      await service.releaseReservedAmount(1, 2026, null, 200000, txManager as any);

      expect(txManager.update).toHaveBeenCalledWith(Budget, 1, {
        reservedAmount: 0,
      });
      expect(txManager.findOne).toHaveBeenCalledWith(
        Budget,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(mockDataSource.manager.update).not.toHaveBeenCalled();
    });
  });

  describe('consumeAmount', () => {
    it('should decrease reserved and increase used', async () => {
      mockDataSource.manager.findOne.mockResolvedValue({
        ...mockBudget,
        reservedAmount: 300000,
        usedAmount: 100000,
      });
      mockDataSource.manager.update.mockResolvedValue({ affected: 1 });

      await service.consumeAmount(1, 2026, null, 300000, 280000);

      expect(mockDataSource.manager.update).toHaveBeenCalledWith(Budget, 1, {
        reservedAmount: 0,
        usedAmount: 380000,
      });
    });

    it('should silently skip if no budget configured', async () => {
      mockDataSource.manager.findOne.mockResolvedValue(null);
      await expect(service.consumeAmount(1, 2026, null, 0, 0)).resolves.toBeUndefined();
      expect(mockDataSource.manager.update).not.toHaveBeenCalled();
    });
  });

  describe('adjustReservedAmount', () => {
    it('should increase reserved by a positive delta within budget', async () => {
      mockDataSource.manager.findOne.mockResolvedValue({
        ...mockBudget,
        reservedAmount: 1200,
        usedAmount: 0,
      });
      mockDataSource.manager.update.mockResolvedValue({ affected: 1 });

      await service.adjustReservedAmount(1, 2026, null, 300);

      expect(mockDataSource.manager.update).toHaveBeenCalledWith(Budget, 1, {
        reservedAmount: 1500,
      });
    });

    it('should throw BadRequestException when positive delta exceeds available budget', async () => {
      // available = 1000000 - 900000 - 50000 = 50000, delta +100000
      mockDataSource.manager.findOne.mockResolvedValue({
        ...mockBudget,
        reservedAmount: 900000,
        usedAmount: 50000,
      });
      await expect(service.adjustReservedAmount(1, 2026, null, 100000)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDataSource.manager.update).not.toHaveBeenCalled();
    });

    it('should decrease reserved by a negative delta without validating availability', async () => {
      mockDataSource.manager.findOne.mockResolvedValue({
        ...mockBudget,
        reservedAmount: 1200,
        usedAmount: 0,
      });
      mockDataSource.manager.update.mockResolvedValue({ affected: 1 });

      await service.adjustReservedAmount(1, 2026, null, -200);

      expect(mockDataSource.manager.update).toHaveBeenCalledWith(Budget, 1, {
        reservedAmount: 1000,
      });
    });

    it('should skip silently when no budget configured', async () => {
      mockDataSource.manager.findOne.mockResolvedValue(null);
      await expect(service.adjustReservedAmount(1, 2026, null, 500)).resolves.toBeUndefined();
      expect(mockDataSource.manager.update).not.toHaveBeenCalled();
    });

    it('should do nothing when delta is zero', async () => {
      await service.adjustReservedAmount(1, 2026, null, 0);
      expect(mockDataSource.manager.findOne).not.toHaveBeenCalled();
      expect(mockDataSource.manager.update).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('should return budget summary with remaining calculation', async () => {
      mockBudgetRepo.findOne.mockResolvedValue({
        ...mockBudget,
        totalAmount: 1000000,
        reservedAmount: 200000,
        usedAmount: 300000,
      });

      const result = await service.getSummary(1, poUser);

      expect(result.remaining).toBe(500000);
      expect(result.usagePercent).toBe(50);
    });

    it('should throw NotFoundException if budget not found', async () => {
      mockBudgetRepo.findOne.mockResolvedValue(null);
      await expect(service.getSummary(999, poUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll (role scoping)', () => {
    it('PO sees budgets across departments (no dept filter forced)', async () => {
      mockBudgetRepo.find.mockResolvedValue([mockBudget]);
      await service.findAll({ fiscalYear: 2026 }, poUser);
      expect(mockBudgetRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { fiscalYear: 2026 } }),
      );
    });

    it('manager is forced to own department (query departmentId ignored)', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 20, departmentId: 7 });
      mockBudgetRepo.find.mockResolvedValue([]);
      await service.findAll({ fiscalYear: 2026, departmentId: 999 }, managerUser);
      expect(mockBudgetRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { fiscalYear: 2026, departmentId: 7 } }),
      );
    });

    it('manager without a department is forbidden', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 20, departmentId: null });
      await expect(service.findAll({ fiscalYear: 2026 }, managerUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSummary (role scoping)', () => {
    it('manager cannot read a summary from another department', async () => {
      mockBudgetRepo.findOne.mockResolvedValue({ ...mockBudget, departmentId: 1 });
      mockUserRepo.findOne.mockResolvedValue({ id: 20, departmentId: 2 });
      await expect(service.getSummary(1, managerUser)).rejects.toThrow(ForbiddenException);
    });

    it('manager can read a summary from their own department', async () => {
      mockBudgetRepo.findOne.mockResolvedValue({
        ...mockBudget,
        departmentId: 2,
        totalAmount: 1000000,
        reservedAmount: 0,
        usedAmount: 0,
      });
      mockUserRepo.findOne.mockResolvedValue({ id: 20, departmentId: 2 });
      const result = await service.getSummary(1, managerUser);
      expect(result.remaining).toBe(1000000);
    });
  });
});
