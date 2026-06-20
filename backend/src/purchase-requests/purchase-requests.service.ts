import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Like, DataSource, QueryFailedError, SelectQueryBuilder } from 'typeorm';
import { PurchaseRequest, PrStatus } from './entities/purchase-request.entity';
import { PurchaseRequestItem } from './entities/purchase-request-item.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { requireManagerDepartmentId } from '../common/manager-scope';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { RejectPurchaseRequestDto } from './dto/reject-purchase-request.dto';
import { PrQueryDto } from './dto/pr-query.dto';
import { BudgetsService } from '../budgets/budgets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { itemTotal, sumMoney } from '../common/money';
import { formatRunningNumber } from '../common/running-number';
import { mapStatsRows, PrStatsResponse } from './pr-stats.util';
import {
  buildMonthWindow,
  fillTrend,
  mapSpendRows,
  SpendPoint,
  TrendPoint,
} from './pr-analytics.util';

@Injectable()
export class PurchaseRequestsService {
  private readonly logger = new Logger(PurchaseRequestsService.name);

  constructor(
    @InjectRepository(PurchaseRequest)
    private readonly prRepository: Repository<PurchaseRequest>,
    @InjectRepository(PurchaseRequestItem)
    private readonly prItemRepository: Repository<PurchaseRequestItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly budgetsService: BudgetsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async generatePrNumber(): Promise<string> {
    const year = new Date().getFullYear();
    // นับเฉพาะ PR ของปีปัจจุบัน (prefix PR-YYYY-) เพื่อ reset running number รายปี (P2-3/S-3)
    // ดึงเลขล่าสุดของปี (MAX) แทนการนับแถว เพราะหลัง DELETE count จะต่ำกว่า suffix สูงสุด → gen เลขซ้ำ → 23505.
    // suffix เป็น zero-padded 4 หลัก ดังนั้น ORDER BY แบบ lexical = numeric order ภายใน prefix ปีเดียวกัน
    const latest = await this.prRepository.findOne({
      where: { prNumber: Like(`PR-${year}-%`) },
      order: { prNumber: 'DESC' },
      select: { id: true, prNumber: true },
    });
    const next = latest ? parseInt(latest.prNumber.slice(-4), 10) + 1 : 1;
    return formatRunningNumber('PR', year, next);
  }

  async create(requesterId: number, dto: CreatePurchaseRequestDto): Promise<PurchaseRequest> {
    const requester = await this.userRepository.findOne({
      where: { id: requesterId },
    });
    if (!requester) throw new NotFoundException('User not found');
    if (requester.departmentId == null) {
      throw new BadRequestException('ผู้ใช้ต้องสังกัดแผนกก่อนสร้างใบขอซื้อ');
    }

    const prNumber = await this.generatePrNumber();

    const items = dto.items.map((item) =>
      this.prItemRepository.create({
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        estimatedUnitPrice: item.estimatedUnitPrice,
        estimatedTotalPrice: itemTotal(item.quantity, item.estimatedUnitPrice),
      }),
    );

    const totalEstimatedAmount = sumMoney(items.map((item) => item.estimatedTotalPrice));

    const pr = this.prRepository.create({
      prNumber,
      requesterId,
      departmentId: requester.departmentId,
      title: dto.title,
      requiredDate: dto.requiredDate,
      quarter: dto.quarter ?? null, // P5-3: null = งบรายปี
      status: PrStatus.DRAFT,
      totalEstimatedAmount,
      items,
    });

    try {
      return await this.prRepository.save(pr);
    } catch (err) {
      // ถ้า 2 request gen pr_number ชนกัน DB unique constraint จะ reject ตัวที่สอง — ให้ client retry (parity กับ PO/GRN)
      if (err instanceof QueryFailedError && (err as { code?: string }).code === '23505') {
        throw new ConflictException('PR number collision, please retry');
      }
      throw err;
    }
  }

  // role-scope กลาง: ใช้ทั้ง findAll และ stats เพื่อกัน scope เพี้ยนคนละทาง
  private applyRoleScope(
    qb: SelectQueryBuilder<PurchaseRequest>,
    user: { id: number; role: UserRole; departmentId?: number | null },
  ): void {
    if (user.role === UserRole.EMPLOYEE) {
      qb.andWhere('pr.requesterId = :userId', { userId: user.id });
    } else if (user.role === UserRole.MANAGER) {
      // dept จาก auth payload (สดทุก request) — ไม่ re-load user จาก DB
      qb.andWhere('pr.departmentId = :deptId', {
        deptId: requireManagerDepartmentId(user),
      });
    }
    // PROCUREMENT_OFFICER: no scope filter — sees all PRs across departments (intentional)
  }

  async findAll(
    user: { id: number; role: UserRole; departmentId?: number | null },
    query: PrQueryDto,
  ): Promise<{
    data: PurchaseRequest[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      from,
      to,
      search,
      sort = 'created_at',
      order = 'DESC',
      prNumber,
      requesterId,
      requesterName,
      eligibleForPo,
    } = query;

    const qb = this.prRepository
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.items', 'items')
      .leftJoinAndSelect('pr.requester', 'requester')
      .leftJoinAndSelect('pr.approver', 'approver');

    this.applyRoleScope(qb, user);

    if (status) qb.andWhere('pr.status = :status', { status });
    // §3.1/§4A: เฉพาะ PR ที่พร้อมแปลงเป็น PO ใหม่ — approved + มีแผนก + ยังไม่มี PO ที่ยัง active.
    // NOT EXISTS อ้าง column ดิบ (pr_id / status) ของตาราง purchase_orders → ต้อง e2e จริง (mock qb พิสูจน์ mapping ไม่ได้)
    if (eligibleForPo) {
      qb.andWhere('pr.status = :eligibleStatus', {
        eligibleStatus: PrStatus.APPROVED,
      });
      qb.andWhere('pr.departmentId IS NOT NULL');
      qb.andWhere(
        'NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.pr_id = pr.id AND po.status != :cancelledStatus)',
        { cancelledStatus: 'cancelled' },
      );
    }
    if (from) qb.andWhere('pr.createdAt >= :from', { from: new Date(from) });
    if (to) {
      const toEnd = new Date(to);
      toEnd.setHours(23, 59, 59, 999);
      qb.andWhere('pr.createdAt <= :to', { to: toEnd });
    }
    if (search) qb.andWhere('pr.title ILIKE :search', { search: `%${search}%` });
    if (prNumber) qb.andWhere('pr.prNumber ILIKE :prNumber', { prNumber: `%${prNumber}%` });
    if (requesterId) qb.andWhere('pr.requesterId = :requesterId', { requesterId });
    if (requesterName) {
      qb.andWhere(
        "CONCAT_WS(' ', requester.firstName, requester.middleName, requester.lastName) ILIKE :requesterName",
        { requesterName: `%${requesterName}%` },
      );
    }

    const sortField =
      sort === 'total_estimated_amount'
        ? 'pr.totalEstimatedAmount'
        : sort === 'title'
          ? 'pr.title'
          : 'pr.createdAt';

    qb.orderBy(sortField, order)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async stats(user: {
    id: number;
    role: UserRole;
    departmentId?: number | null;
  }): Promise<PrStatsResponse> {
    const qb = this.prRepository
      .createQueryBuilder('pr')
      .select('pr.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pr.status');
    this.applyRoleScope(qb, user);
    const rows = await qb.getRawMany<{ status: PrStatus; count: string }>();
    return mapStatsRows(rows);
  }

  async trend(user: {
    id: number;
    role: UserRole;
    departmentId?: number | null;
  }): Promise<TrendPoint[]> {
    const now = new Date();
    const months = buildMonthWindow(now, 12);
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const qb = this.prRepository
      .createQueryBuilder('pr')
      .select("to_char(date_trunc('month', pr.created_at), 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('pr.created_at >= :start', { start })
      .groupBy("to_char(date_trunc('month', pr.created_at), 'YYYY-MM')");
    this.applyRoleScope(qb, user);
    const rows = await qb.getRawMany<{ month: string; count: string }>();
    return fillTrend(months, rows);
  }

  async spendByDepartment(): Promise<SpendPoint[]> {
    const fiscalYear = new Date().getFullYear();
    const qb = this.prRepository
      .createQueryBuilder('pr')
      .innerJoin('pr.department', 'dept')
      .select('pr.departmentId', 'departmentId')
      .addSelect('dept.name', 'departmentName')
      .addSelect('SUM(pr.total_estimated_amount)', 'total')
      .where('pr.status = :status', { status: PrStatus.APPROVED })
      .andWhere('pr.fiscalYear = :fiscalYear', { fiscalYear })
      .groupBy('pr.departmentId')
      .addGroupBy('dept.name')
      .orderBy('total', 'DESC');
    const rows = await qb.getRawMany<{
      departmentId: string;
      departmentName: string;
      total: string;
    }>();
    return mapSpendRows(rows);
  }

  async findOne(
    id: number,
    user: { id: number; role: UserRole; departmentId?: number | null },
  ): Promise<PurchaseRequest> {
    const pr = await this.prRepository.findOne({
      where: { id },
      relations: {
        items: true,
        requester: true,
        approver: true,
        department: true,
      },
    });
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`);

    if (user.role === UserRole.EMPLOYEE && pr.requesterId !== user.id) {
      throw new ForbiddenException('Cannot access this Purchase Request');
    }

    if (user.role === UserRole.MANAGER) {
      // dept จาก auth payload (สดทุก request) — ไม่ re-load user จาก DB
      if (pr.departmentId !== requireManagerDepartmentId(user)) {
        throw new ForbiddenException('Cannot access PRs from other departments');
      }
    }
    // PROCUREMENT_OFFICER: no access restriction — can view any PR (intentional)

    return pr;
  }

  async update(
    id: number,
    requesterId: number,
    dto: UpdatePurchaseRequestDto,
  ): Promise<PurchaseRequest> {
    const pr = await this.prRepository.findOne({
      where: { id, requesterId },
      relations: { items: true },
    });
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`);
    if (pr.status !== PrStatus.DRAFT) throw new BadRequestException('Only draft PRs can be edited');

    if (dto.title) pr.title = dto.title;
    if (dto.requiredDate) pr.requiredDate = dto.requiredDate;

    if (dto.items) {
      await this.prItemRepository.delete({ prId: id });
      const newItems = dto.items.map((item) =>
        this.prItemRepository.create({
          prId: id,
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          estimatedUnitPrice: item.estimatedUnitPrice,
          estimatedTotalPrice: itemTotal(item.quantity, item.estimatedUnitPrice),
        }),
      );
      pr.items = await this.prItemRepository.save(newItems);
      pr.totalEstimatedAmount = sumMoney(pr.items.map((item) => item.estimatedTotalPrice));
    }

    return this.prRepository.save(pr);
  }

  async remove(id: number, requesterId: number): Promise<void> {
    const pr = await this.prRepository.findOne({ where: { id, requesterId } });
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`);
    if (pr.status !== PrStatus.DRAFT)
      throw new BadRequestException('Only draft PRs can be deleted');
    await this.prRepository.remove(pr);
  }

  async submit(id: number, requesterId: number): Promise<PurchaseRequest> {
    const pr = await this.prRepository.findOne({ where: { id, requesterId } });
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`);
    if (pr.status !== PrStatus.DRAFT)
      throw new BadRequestException('Only draft PRs can be submitted');

    pr.status = PrStatus.SUBMITTED;
    const saved = await this.dataSource.transaction(async (txManager) => {
      const result = await txManager.save(PurchaseRequest, pr);
      await this.auditLogsService.log(
        {
          userId: requesterId,
          action: 'PR_SUBMITTED',
          entityType: 'PurchaseRequest',
          entityId: id,
          oldValue: { status: PrStatus.DRAFT },
          newValue: { status: PrStatus.SUBMITTED },
        },
        txManager,
      );
      return result;
    });

    void (async () => {
      if (pr.departmentId == null) return;
      const managers = await this.userRepository.find({
        where: {
          departmentId: pr.departmentId,
          role: UserRole.MANAGER,
          isActive: true,
        },
      });
      if (managers.length > 0) {
        await this.notificationsService.sendToMany(
          managers.map((m) => m.id),
          {
            title: 'มี PR ใหม่รอการอนุมัติ',
            message: `${saved.prNumber}: ${saved.title} รอการอนุมัติ`,
            type: NotificationType.PR_SUBMITTED,
            referenceId: id,
            referenceType: 'PurchaseRequest',
          },
        );
      }
    })().catch((err) => this.logger.warn('notification failed: PR_SUBMITTED', err));

    return saved;
  }

  async approve(id: number, managerId: number): Promise<PurchaseRequest> {
    const pr = await this.prRepository.findOne({ where: { id } });
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`);
    if (pr.status !== PrStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted PRs can be approved');
    }

    if (pr.departmentId == null) {
      throw new BadRequestException('ใบขอซื้อนี้ไม่มีแผนก ไม่สามารถอนุมัติได้');
    }
    const prDepartmentId: number = pr.departmentId;

    const manager = await this.userRepository.findOne({
      where: { id: managerId },
    });
    if (!manager) throw new NotFoundException('Manager not found');
    if (prDepartmentId !== manager.departmentId) {
      throw new ForbiddenException('Cannot approve PRs from other departments');
    }

    // P5-5: ตรึงปีงบประมาณตอน approve เพื่อใช้ค่าเดิมตลอด lifecycle (reserve→consume/release)
    const fiscalYear = new Date().getFullYear();

    const savedPr = await this.dataSource.transaction(async (txManager) => {
      pr.status = PrStatus.APPROVED;
      pr.approvedBy = managerId;
      pr.approvedAt = new Date();
      pr.fiscalYear = fiscalYear;
      const saved = await txManager.save(PurchaseRequest, pr);

      await this.budgetsService.reserveAmount(
        prDepartmentId,
        fiscalYear,
        pr.quarter, // P5-3: จองงบไตรมาสที่ PR เลือก (null = งบรายปี)
        Number(pr.totalEstimatedAmount),
        txManager,
      );

      await this.auditLogsService.log(
        {
          userId: managerId,
          action: 'PR_APPROVED',
          entityType: 'PurchaseRequest',
          entityId: id,
          oldValue: { status: PrStatus.SUBMITTED },
          newValue: { status: PrStatus.APPROVED, approvedBy: managerId },
        },
        txManager,
      );

      return saved;
    });

    void this.notificationsService
      .send({
        userId: savedPr.requesterId,
        title: 'PR ของคุณได้รับการอนุมัติ',
        message: `${savedPr.prNumber}: ${savedPr.title} ได้รับการอนุมัติแล้ว`,
        type: NotificationType.PR_APPROVED,
        referenceId: id,
        referenceType: 'PurchaseRequest',
      })
      .catch((err) => this.logger.warn('notification failed: PR_APPROVED', err));

    return savedPr;
  }

  async reject(
    id: number,
    managerId: number,
    dto: RejectPurchaseRequestDto,
  ): Promise<PurchaseRequest> {
    const pr = await this.prRepository.findOne({ where: { id } });
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`);
    if (pr.status !== PrStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted PRs can be rejected');
    }
    if (pr.departmentId == null) {
      throw new BadRequestException('ใบขอซื้อนี้ไม่มีแผนก ไม่สามารถปฏิเสธได้');
    }

    const manager = await this.userRepository.findOne({
      where: { id: managerId },
    });
    if (!manager) throw new NotFoundException('Manager not found');
    if (pr.departmentId !== manager.departmentId) {
      throw new ForbiddenException('Cannot reject PRs from other departments');
    }

    pr.status = PrStatus.REJECTED;
    pr.rejectReason = dto.reason;
    const saved = await this.dataSource.transaction(async (txManager) => {
      const result = await txManager.save(PurchaseRequest, pr);
      await this.auditLogsService.log(
        {
          userId: managerId,
          action: 'PR_REJECTED',
          entityType: 'PurchaseRequest',
          entityId: id,
          oldValue: { status: PrStatus.SUBMITTED },
          newValue: { status: PrStatus.REJECTED, rejectReason: dto.reason },
        },
        txManager,
      );
      return result;
    });

    void this.notificationsService
      .send({
        userId: saved.requesterId,
        title: 'PR ของคุณถูกปฏิเสธ',
        message: `${saved.prNumber}: ${saved.title} ถูกปฏิเสธ — เหตุผล: ${dto.reason}`,
        type: NotificationType.PR_REJECTED,
        referenceId: id,
        referenceType: 'PurchaseRequest',
      })
      .catch((err) => this.logger.warn('notification failed: PR_REJECTED', err));

    return saved;
  }
}
