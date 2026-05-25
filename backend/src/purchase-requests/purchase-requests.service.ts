import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Like, DataSource, QueryFailedError } from 'typeorm';
import { PurchaseRequest, PrStatus } from './entities/purchase-request.entity';
import { PurchaseRequestItem } from './entities/purchase-request-item.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { RejectPurchaseRequestDto } from './dto/reject-purchase-request.dto';
import { PrQueryDto } from './dto/pr-query.dto';
import { BudgetsService } from '../budgets/budgets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class PurchaseRequestsService {
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
    return `PR-${year}-${String(next).padStart(4, '0')}`;
  }

  async create(requesterId: number, dto: CreatePurchaseRequestDto): Promise<PurchaseRequest> {
    const requester = await this.userRepository.findOne({ where: { id: requesterId } });
    if (!requester) throw new NotFoundException('User not found');

    const prNumber = await this.generatePrNumber();

    const items = dto.items.map((item) =>
      this.prItemRepository.create({
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        estimatedUnitPrice: item.estimatedUnitPrice,
        estimatedTotalPrice: Number((item.quantity * item.estimatedUnitPrice).toFixed(2)),
      }),
    );

    const totalEstimatedAmount = Number(
      items.reduce((sum, item) => sum + Number(item.estimatedTotalPrice), 0).toFixed(2),
    );

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

  async findAll(
    user: { id: number; role: UserRole },
    query: PrQueryDto,
  ): Promise<{ data: PurchaseRequest[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page = 1, limit = 20, status, from, to, search, sort = 'created_at', order = 'DESC' } = query;

    const qb = this.prRepository
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.items', 'items')
      .leftJoinAndSelect('pr.requester', 'requester')
      .leftJoinAndSelect('pr.approver', 'approver');

    if (user.role === UserRole.EMPLOYEE) {
      qb.andWhere('pr.requesterId = :userId', { userId: user.id });
    } else if (user.role === UserRole.MANAGER) {
      const fullUser = await this.userRepository.findOne({ where: { id: user.id } });
      if (!fullUser) throw new NotFoundException('User not found');
      qb.andWhere('pr.departmentId = :deptId', { deptId: fullUser.departmentId });
    }
    // PROCUREMENT_OFFICER: no scope filter — sees all PRs across departments (intentional)

    if (status) qb.andWhere('pr.status = :status', { status });
    if (from) qb.andWhere('pr.createdAt >= :from', { from: new Date(from) });
    if (to) {
      const toEnd = new Date(to);
      toEnd.setHours(23, 59, 59, 999);
      qb.andWhere('pr.createdAt <= :to', { to: toEnd });
    }
    if (search) qb.andWhere('pr.title ILIKE :search', { search: `%${search}%` });

    const sortField =
      sort === 'total_estimated_amount' ? 'pr.totalEstimatedAmount'
      : sort === 'title' ? 'pr.title'
      : 'pr.createdAt';

    qb.orderBy(sortField, order as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(
    id: number,
    user: { id: number; role: UserRole },
  ): Promise<PurchaseRequest> {
    const pr = await this.prRepository.findOne({
      where: { id },
      relations: { items: true, requester: true, approver: true },
    });
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`);

    if (user.role === UserRole.EMPLOYEE && pr.requesterId !== user.id) {
      throw new ForbiddenException('Cannot access this Purchase Request');
    }

    if (user.role === UserRole.MANAGER) {
      const fullUser = await this.userRepository.findOne({ where: { id: user.id } });
      if (!fullUser) throw new NotFoundException('User not found');
      if (pr.departmentId !== fullUser.departmentId) {
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
          estimatedTotalPrice: Number((item.quantity * item.estimatedUnitPrice).toFixed(2)),
        }),
      );
      pr.items = await this.prItemRepository.save(newItems);
      pr.totalEstimatedAmount = Number(
        pr.items.reduce((sum, item) => sum + Number(item.estimatedTotalPrice), 0).toFixed(2),
      );
    }

    return this.prRepository.save(pr);
  }

  async remove(id: number, requesterId: number): Promise<void> {
    const pr = await this.prRepository.findOne({ where: { id, requesterId } });
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`);
    if (pr.status !== PrStatus.DRAFT) throw new BadRequestException('Only draft PRs can be deleted');
    await this.prRepository.remove(pr);
  }

  async submit(id: number, requesterId: number): Promise<PurchaseRequest> {
    const pr = await this.prRepository.findOne({ where: { id, requesterId } });
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`);
    if (pr.status !== PrStatus.DRAFT) throw new BadRequestException('Only draft PRs can be submitted');

    pr.status = PrStatus.SUBMITTED;
    const saved = await this.prRepository.save(pr);

    void this.auditLogsService.log({
      userId: requesterId,
      action: 'PR_SUBMITTED',
      entityType: 'PurchaseRequest',
      entityId: id,
      oldValue: { status: PrStatus.DRAFT },
      newValue: { status: PrStatus.SUBMITTED },
    }).catch(() => {});

    void (async () => {
      const managers = await this.userRepository.find({
        where: { departmentId: pr.departmentId, role: UserRole.MANAGER, isActive: true },
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
    })().catch(() => {});

    return saved;
  }

  async approve(id: number, managerId: number): Promise<PurchaseRequest> {
    const pr = await this.prRepository.findOne({ where: { id } });
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`);
    if (pr.status !== PrStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted PRs can be approved');
    }

    const manager = await this.userRepository.findOne({ where: { id: managerId } });
    if (!manager) throw new NotFoundException('Manager not found');
    if (pr.departmentId !== manager.departmentId) {
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
        pr.departmentId,
        fiscalYear,
        pr.quarter, // P5-3: จองงบไตรมาสที่ PR เลือก (null = งบรายปี)
        Number(pr.totalEstimatedAmount),
        txManager,
      );

      return saved;
    });

    void this.auditLogsService.log({
      userId: managerId,
      action: 'PR_APPROVED',
      entityType: 'PurchaseRequest',
      entityId: id,
      oldValue: { status: PrStatus.SUBMITTED },
      newValue: { status: PrStatus.APPROVED, approvedBy: managerId },
    }).catch(() => {});

    void this.notificationsService.send({
      userId: savedPr.requesterId,
      title: 'PR ของคุณได้รับการอนุมัติ',
      message: `${savedPr.prNumber}: ${savedPr.title} ได้รับการอนุมัติแล้ว`,
      type: NotificationType.PR_APPROVED,
      referenceId: id,
      referenceType: 'PurchaseRequest',
    }).catch(() => {});

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

    const manager = await this.userRepository.findOne({ where: { id: managerId } });
    if (!manager) throw new NotFoundException('Manager not found');
    if (pr.departmentId !== manager.departmentId) {
      throw new ForbiddenException('Cannot reject PRs from other departments');
    }

    pr.status = PrStatus.REJECTED;
    pr.rejectReason = dto.reason;
    const saved = await this.prRepository.save(pr);

    void this.auditLogsService.log({
      userId: managerId,
      action: 'PR_REJECTED',
      entityType: 'PurchaseRequest',
      entityId: id,
      oldValue: { status: PrStatus.SUBMITTED },
      newValue: { status: PrStatus.REJECTED, rejectReason: dto.reason },
    }).catch(() => {});

    void this.notificationsService.send({
      userId: saved.requesterId,
      title: 'PR ของคุณถูกปฏิเสธ',
      message: `${saved.prNumber}: ${saved.title} ถูกปฏิเสธ — เหตุผล: ${dto.reason}`,
      type: NotificationType.PR_REJECTED,
      referenceId: id,
      referenceType: 'PurchaseRequest',
    }).catch(() => {});

    return saved;
  }
}
