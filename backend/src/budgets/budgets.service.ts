import {
  Injectable, Logger, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource, EntityManager, FindOptionsWhere } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { Department } from '../departments/entities/department.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetQueryDto } from './dto/budget-query.dto';
import { applyReserve, applyRelease, applyAdjust, applyConsume } from '../common/budget-math';

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateBudgetDto): Promise<Budget> {
    const existing = await this.budgetRepository.findOne({
      where: this.budgetWhere(dto.departmentId, dto.fiscalYear, dto.quarter ?? null),
    });
    if (existing) {
      throw new ConflictException(
        `Budget for department ${dto.departmentId} in ${dto.fiscalYear} Q${dto.quarter ?? 'annual'} already exists`,
      );
    }

    const budget = this.budgetRepository.create({
      departmentId: dto.departmentId,
      fiscalYear: dto.fiscalYear,
      quarter: dto.quarter ?? null,
      totalAmount: dto.totalAmount,
      reservedAmount: 0,
      usedAmount: 0,
    });
    try {
      return await this.budgetRepository.save(budget);
    } catch (err) {
      // Race safety net: the findOne check above can be bypassed by a concurrent
      // insert. The DB unique constraint (incl. the annual partial index) then
      // raises 23505 — surface it as a ConflictException, not a 500.
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(
          `Budget for department ${dto.departmentId} in ${dto.fiscalYear} Q${dto.quarter ?? 'annual'} already exists`,
        );
      }
      throw err;
    }
  }

  async findAll(query: BudgetQueryDto): Promise<Budget[]> {
    const where: FindOptionsWhere<Budget> = {};
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.fiscalYear) where.fiscalYear = query.fiscalYear;
    return this.budgetRepository.find({
      where,
      relations: { department: true },
      order: { fiscalYear: 'DESC' },
    });
  }

  async findByDepartment(departmentId: number): Promise<Budget[]> {
    return this.budgetRepository.find({
      where: { departmentId },
      order: { fiscalYear: 'DESC' },
    });
  }

  async update(id: number, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({ where: { id } });
    if (!budget) throw new NotFoundException(`Budget ${id} not found`);

    const committed = Number(budget.reservedAmount) + Number(budget.usedAmount);
    if (dto.totalAmount < committed) {
      throw new BadRequestException(
        `Cannot reduce totalAmount below already committed amount (${committed})`,
      );
    }

    budget.totalAmount = dto.totalAmount;
    return this.budgetRepository.save(budget);
  }

  async getSummary(id: number): Promise<Budget & { remaining: number; usagePercent: number }> {
    const budget = await this.budgetRepository.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!budget) throw new NotFoundException(`Budget ${id} not found`);

    const reserved = Number(budget.reservedAmount);
    const used = Number(budget.usedAmount);
    const total = Number(budget.totalAmount);
    const remaining = Number((total - reserved - used).toFixed(2));
    const usagePercent = Math.round(((reserved + used) / total) * 100);

    return Object.assign(budget, { remaining, usagePercent });
  }

  // P5-3: where clause กลางสำหรับ reserve/release/consume — เล็ง budget row ตาม quarter
  // quarter == null → งบรายปี (IsNull), 1-4 → ไตรมาสนั้น (match ตรง ไม่มี fallback)
  private budgetWhere(
    departmentId: number,
    fiscalYear: number,
    quarter: number | null,
  ): FindOptionsWhere<Budget> {
    return {
      departmentId,
      fiscalYear,
      quarter: (quarter == null
        ? IsNull()
        : quarter) as FindOptionsWhere<Budget>['quarter'],
    };
  }

  // P5-3: label period ใช้ใน NotFound message
  private periodLabel(quarter: number | null): string {
    return quarter == null ? 'รายปี (annual)' : `Q${quarter}`;
  }

  async reserveAmount(
    departmentId: number,
    fiscalYear: number,
    quarter: number | null,
    amount: number,
    txManager?: EntityManager,
  ): Promise<void> {
    const mgr = txManager ?? this.dataSource.manager;

    // P5-4: pessimistic write lock กัน lost update เมื่อ 2 approve จองงบ row เดียวกันพร้อมกัน
    // ต้องเรียกภายใน transaction เสมอ (PR approve ส่ง txManager มาให้อยู่แล้ว)
    const budget = await mgr.findOne(Budget, {
      where: this.budgetWhere(departmentId, fiscalYear, quarter),
      lock: { mode: 'pessimistic_write' },
    });
    if (!budget) {
      throw new NotFoundException(
        `No budget (${this.periodLabel(quarter)}) for department ${departmentId} in fiscal year ${fiscalYear}. กรุณากำหนดงบประมาณก่อน`,
      );
    }

    const newReserved = Number(budget.reservedAmount) + amount;
    const totalCommitted = newReserved + Number(budget.usedAmount);

    if (totalCommitted > Number(budget.totalAmount)) {
      const available = Number(budget.totalAmount) - Number(budget.reservedAmount) - Number(budget.usedAmount);
      throw new BadRequestException(
        `งบประมาณไม่เพียงพอ: ต้องการ ${amount}, คงเหลือ ${available}`,
      );
    }

    await mgr.update(Budget, budget.id, {
      reservedAmount: applyReserve(Number(budget.reservedAmount), amount),
    });

    if (totalCommitted / Number(budget.totalAmount) > 0.8) {
      void this.notifyBudgetWarning(departmentId, fiscalYear, totalCommitted, Number(budget.totalAmount))
        .catch((err) => this.logger.warn('notification failed: BUDGET_WARNING', err));
    }
  }

  async releaseReservedAmount(
    departmentId: number,
    fiscalYear: number,
    quarter: number | null,
    amount: number,
    txManager?: EntityManager,
  ): Promise<void> {
    const mgr = txManager ?? this.dataSource.manager;

    // P5-4: pessimistic write lock กัน lost update เมื่อ release ชน consume/reserve บน budget row เดียวกัน
    const budget = await mgr.findOne(Budget, {
      where: this.budgetWhere(departmentId, fiscalYear, quarter),
      lock: { mode: 'pessimistic_write' },
    });
    if (!budget) return;

    await mgr.update(Budget, budget.id, {
      reservedAmount: applyRelease(Number(budget.reservedAmount), amount),
    });
  }

  async consumeAmount(
    departmentId: number,
    fiscalYear: number,
    quarter: number | null,
    reservedToRelease: number,
    usedToAdd: number,
    txManager?: EntityManager,
  ): Promise<void> {
    const mgr = txManager ?? this.dataSource.manager;

    // P5-4: lock row เดียวกัน กัน lost update เมื่อ GRN หลายใบ consume budget เดียวกันพร้อมกัน
    const budget = await mgr.findOne(Budget, {
      where: this.budgetWhere(departmentId, fiscalYear, quarter),
      lock: { mode: 'pessimistic_write' },
    });
    if (!budget) return;

    const { reserved: newReserved, used: newUsed } = applyConsume(
      Number(budget.reservedAmount),
      Number(budget.usedAmount),
      reservedToRelease,
      usedToAdd,
    );
    await mgr.update(Budget, budget.id, {
      reservedAmount: newReserved,
      usedAmount: newUsed,
    });
  }

  // P5-6: ปรับ reserved ให้สะท้อนยอด PO จริงตอนสร้าง PO (delta = PO total - PR estimate)
  // delta > 0 (PO แพงกว่าที่ประเมิน) ต้องเช็คงบคงเหลือก่อน เพื่อกัน used ทะลุ total ตอน consume
  // delta < 0 (PO ถูกกว่า) คืนงบส่วนเกิน ไม่ต้อง validate
  async adjustReservedAmount(
    departmentId: number,
    fiscalYear: number,
    quarter: number | null,
    delta: number,
    txManager?: EntityManager,
  ): Promise<void> {
    if (delta === 0) return;
    const mgr = txManager ?? this.dataSource.manager;

    const budget = await mgr.findOne(Budget, {
      where: this.budgetWhere(departmentId, fiscalYear, quarter),
      lock: { mode: 'pessimistic_write' },
    });
    if (!budget) return;

    // ดิบ (ไม่ปัดผ่าน round2) — ใช้เฉพาะ validate เกินงบ + warning 80%; ค่าที่ store ใช้ applyAdjust ด้านล่าง
    const newReserved = Math.max(0, Number(budget.reservedAmount) + delta);

    if (delta > 0) {
      const totalCommitted = newReserved + Number(budget.usedAmount);
      if (totalCommitted > Number(budget.totalAmount)) {
        const available =
          Number(budget.totalAmount) - Number(budget.reservedAmount) - Number(budget.usedAmount);
        throw new BadRequestException(
          `งบประมาณไม่เพียงพอสำหรับยอด PO ที่เพิ่มขึ้น: ต้องการเพิ่ม ${delta}, คงเหลือ ${available}`,
        );
      }
    }

    await mgr.update(Budget, budget.id, {
      reservedAmount: applyAdjust(Number(budget.reservedAmount), delta),
    });

    const totalCommitted = newReserved + Number(budget.usedAmount);
    if (delta > 0 && totalCommitted / Number(budget.totalAmount) > 0.8) {
      void this.notifyBudgetWarning(departmentId, fiscalYear, totalCommitted, Number(budget.totalAmount))
        .catch((err) => this.logger.warn('notification failed: BUDGET_WARNING', err));
    }
  }

  private async notifyBudgetWarning(
    departmentId: number,
    fiscalYear: number,
    committed: number,
    total: number,
  ): Promise<void> {
    const usagePercent = Math.round((committed / total) * 100);
    const managers = await this.userRepository.find({
      where: [
        { departmentId, role: UserRole.MANAGER, isActive: true },
        { role: UserRole.PROCUREMENT_OFFICER, isActive: true },
      ],
    });
    if (managers.length === 0) return;

    // procurement officer รับแจ้งงบหลายแผนก → ใส่ชื่อแผนกในข้อความให้แยกออกว่าเป็นงบของแผนกไหน
    const department = await this.departmentRepository.findOne({ where: { id: departmentId } });
    const deptName = department?.name ?? `แผนก #${departmentId}`;

    await this.notificationsService.sendToMany(
      managers.map((m) => m.id),
      {
        title: `⚠ งบประมาณ ${deptName} ปี ${fiscalYear} ใกล้หมด`,
        message: `งบประมาณแผนก ${deptName} ใช้ไปแล้ว ${usagePercent}% (${committed.toLocaleString()} / ${total.toLocaleString()} บาท)`,
        type: NotificationType.BUDGET_WARNING,
        referenceType: 'Budget',
      },
    );
  }
}
