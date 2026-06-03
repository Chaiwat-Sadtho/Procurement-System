import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Not, QueryFailedError, Like } from 'typeorm';
import { PurchaseOrder, PoStatus } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PurchaseRequest, PrStatus } from '../purchase-requests/entities/purchase-request.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { VendorRating } from '../vendors/entities/vendor-rating.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { RateVendorDto } from './dto/rate-vendor.dto';
import { PoQueryDto } from './dto/po-query.dto';
import { BudgetsService } from '../budgets/budgets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { itemTotal, sumMoney } from '../common/money';
import { formatRunningNumber } from '../common/running-number';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly poItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(PurchaseRequest)
    private readonly prRepository: Repository<PurchaseRequest>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(VendorRating)
    private readonly ratingRepository: Repository<VendorRating>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly budgetsService: BudgetsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async generatePoNumber(): Promise<string> {
    const year = new Date().getFullYear();
    // นับเฉพาะ PO ของปีปัจจุบัน (prefix PO-YYYY-) เพื่อ reset running number รายปี (P2-3/S-3)
    // ดึงเลขล่าสุดของปี (MAX) แทนการนับแถว เพราะหลัง DELETE count จะต่ำกว่า suffix สูงสุด → gen เลขซ้ำ → 23505.
    // suffix เป็น zero-padded 4 หลัก ดังนั้น ORDER BY แบบ lexical = numeric order ภายใน prefix ปีเดียวกัน
    const latest = await this.poRepository.findOne({
      where: { poNumber: Like(`PO-${year}-%`) },
      order: { poNumber: 'DESC' },
      select: { id: true, poNumber: true },
    });
    const next = latest ? parseInt(latest.poNumber.slice(-4), 10) + 1 : 1;
    return formatRunningNumber('PO', year, next);
  }

  async create(createdBy: number, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const pr = await this.prRepository.findOne({ where: { id: dto.prId } });
    if (!pr) throw new NotFoundException(`Purchase Request ${dto.prId} not found`);
    if (pr.status !== PrStatus.APPROVED) {
      throw new BadRequestException('Can only create PO from approved Purchase Requests');
    }

    // P4-2: กันสร้าง PO ซ้ำจาก PR เดียว — approved PR แปลงเป็น PO ได้ครั้งเดียว (ยกเว้น PO ที่ถูกยกเลิก)
    const existingPo = await this.poRepository.findOne({
      where: { prId: dto.prId, status: Not(PoStatus.CANCELLED) },
    });
    if (existingPo) {
      throw new ConflictException(
        `Purchase Request ${dto.prId} already has an active PO (${existingPo.poNumber})`,
      );
    }

    const vendor = await this.vendorRepository.findOne({ where: { id: dto.vendorId } });
    if (!vendor) throw new NotFoundException(`Vendor ${dto.vendorId} not found`);
    if (vendor.isBlacklisted) {
      throw new BadRequestException(`Vendor "${vendor.name}" is blacklisted and cannot be used`);
    }

    const poNumber = await this.generatePoNumber();

    const items = dto.items.map((item) =>
      this.poItemRepository.create({
        prItemId: item.prItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal(item.quantity, item.unitPrice),
        receivedQuantity: 0,
      }),
    );

    const totalAmount = sumMoney(items.map((item) => item.totalPrice));

    const po = this.poRepository.create({
      poNumber,
      prId: dto.prId,
      vendorId: dto.vendorId,
      createdBy,
      status: PoStatus.DRAFT,
      totalAmount,
      expectedDeliveryDate: dto.expectedDeliveryDate,
      notes: dto.notes,
      items,
    });

    if (pr.departmentId == null) {
      throw new BadRequestException('PR ที่เชื่อมโยงไม่มีแผนก');
    }
    const prDepartmentId: number = pr.departmentId;

    // P5-6: reserved ถูกจองด้วย PR estimate ตอน approve — ปรับให้ตรงยอด PO จริง (delta) ภายใน transaction เดียวกับการ save PO
    // ถ้า PO แพงกว่างบคงเหลือ adjustReservedAmount จะ throw → rollback ไม่สร้าง PO (กัน used ทะลุ total ตอน consume)
    const reserveDelta = Number(totalAmount) - Number(pr.totalEstimatedAmount);

    let savedPo: PurchaseOrder;
    try {
      savedPo = await this.dataSource.transaction(async (manager) => {
        await this.budgetsService.adjustReservedAmount(
          prDepartmentId,
          pr.fiscalYear ?? new Date().getFullYear(),
          pr.quarter,
          reserveDelta,
          manager,
        );
        return manager.save(PurchaseOrder, po);
      });
    } catch (err) {
      if (err instanceof QueryFailedError && (err as { code?: string }).code === '23505') {
        const constraint = (err as { constraint?: string }).constraint;
        // P4-2: index บังคับว่า PR มี active PO ได้ใบเดียว — ถ้า app-level check หลุดเพราะ race DB จะจับตรงนี้
        if (constraint === 'UQ_active_po_per_pr') {
          throw new ConflictException(
            `Purchase Request ${dto.prId} already has an active PO`,
          );
        }
        // ถ้า 2 request gen po_number ชนกัน DB unique constraint จะ reject ตัวที่สอง — ให้ client retry
        throw new ConflictException('PO number collision, please retry');
      }
      throw err;
    }

    void this.auditLogsService.log({
      userId: createdBy,
      action: 'PO_CREATED',
      entityType: 'PurchaseOrder',
      entityId: savedPo.id,
      newValue: {
        poNumber: savedPo.poNumber,
        prId: dto.prId,
        vendorId: dto.vendorId,
        totalAmount: savedPo.totalAmount,
      },
    }).catch(() => {});

    void (async () => {
      const linkedPr = await this.prRepository.findOne({
        where: { id: dto.prId },
        select: { id: true, requesterId: true, prNumber: true },
      });
      if (linkedPr) {
        await this.notificationsService.send({
          userId: linkedPr.requesterId,
          title: 'สร้าง PO จาก PR ของคุณแล้ว',
          message: `${savedPo.poNumber} ถูกสร้างจาก ${linkedPr.prNumber} แล้ว`,
          type: NotificationType.PO_CREATED,
          referenceId: savedPo.id,
          referenceType: 'PurchaseOrder',
        });
      }
    })().catch(() => {});

    return savedPo;
  }

  async findAll(
    query: PoQueryDto,
  ): Promise<{ data: PurchaseOrder[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page = 1, limit = 20, status, vendorId, prId, receivable } = query;

    const qb = this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.items', 'items')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .leftJoinAndSelect('po.purchaseRequest', 'pr');

    if (status) qb.andWhere('po.status = :status', { status });
    if (vendorId) qb.andWhere('po.vendorId = :vendorId', { vendorId });
    if (prId) qb.andWhere('po.prId = :prId', { prId });
    if (receivable)
      qb.andWhere('po.status IN (:...receivable)', {
        receivable: [PoStatus.ACKNOWLEDGED, PoStatus.PARTIALLY_RECEIVED],
      });

    const [data, total] = await qb
      .orderBy('po.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({
      where: { id },
      relations: { items: true, vendor: true, purchaseRequest: true, createdByUser: true },
    });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    return po;
  }

  async update(id: number, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({
      where: { id },
      relations: { items: true, purchaseRequest: true },
    });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    if (po.status !== PoStatus.DRAFT) throw new BadRequestException('Only draft POs can be edited');

    if (dto.expectedDeliveryDate) po.expectedDeliveryDate = dto.expectedDeliveryDate;
    if (dto.notes !== undefined) po.notes = dto.notes;

    if (dto.items) {
      // delete-recreate ของ items ต้อง atomic — ถ้า save ใหม่ล้มหลัง delete ไปแล้ว PO จะเหลือ 0 item
      const items = dto.items;
      const oldTotal = Number(po.totalAmount);
      const pr = po.purchaseRequest;
      return this.dataSource.transaction(async (manager) => {
        await manager.delete(PurchaseOrderItem, { poId: id });
        const newItems = items.map((item) =>
          manager.create(PurchaseOrderItem, {
            poId: id,
            prItemId: item.prItemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: itemTotal(item.quantity, item.unitPrice),
            receivedQuantity: 0,
          }),
        );
        po.items = await manager.save(PurchaseOrderItem, newItems);
        po.totalAmount = sumMoney(po.items.map((item) => item.totalPrice));

        // P5-6 (F2): keep the dept budget reserved in sync with the edited total —
        // mirror create's delta-gate. A positive delta beyond remaining budget throws
        // inside this transaction → the item delete/recreate rolls back (PO unchanged).
        if (pr?.departmentId != null) {
          await this.budgetsService.adjustReservedAmount(
            pr.departmentId,
            pr.fiscalYear ?? new Date().getFullYear(),
            pr.quarter,
            Number(po.totalAmount) - oldTotal,
            manager,
          );
        }
        return manager.save(PurchaseOrder, po);
      });
    }

    return this.poRepository.save(po);
  }

  async send(id: number): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    if (po.status !== PoStatus.DRAFT) throw new BadRequestException('Only draft POs can be sent');
    po.status = PoStatus.SENT;
    return this.poRepository.save(po);
  }

  async acknowledge(id: number, userId: number): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    if (po.status !== PoStatus.SENT) {
      throw new BadRequestException('Only sent POs can be acknowledged');
    }
    po.status = PoStatus.ACKNOWLEDGED;
    const saved = await this.poRepository.save(po);

    void this.auditLogsService.log({
      userId,
      action: 'PO_ACKNOWLEDGED',
      entityType: 'PurchaseOrder',
      entityId: id,
      oldValue: { status: PoStatus.SENT },
      newValue: { status: PoStatus.ACKNOWLEDGED },
    }).catch(() => {});

    return saved;
  }

  async cancel(id: number, userId: number): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    if (po.status === PoStatus.COMPLETED) {
      throw new BadRequestException('Completed POs cannot be cancelled');
    }
    if (po.status === PoStatus.CANCELLED) {
      throw new BadRequestException('PO is already cancelled');
    }
    const oldStatus = po.status;
    po.status = PoStatus.CANCELLED;
    const saved = await this.poRepository.save(po);

    // P5-2: release reserved budget ของ PR ที่ผูกอยู่ กัน budget leak
    // (PO ที่ COMPLETED ยกเลิกไม่ได้ และ consume เกิดเฉพาะตอน complete → ไม่มีทาง double-release กับ consume)
    void (async () => {
      const pr = await this.prRepository.findOne({
        where: { id: po.prId },
        select: {
          id: true, departmentId: true, fiscalYear: true,
          quarter: true, totalEstimatedAmount: true, status: true,
        },
      });
      if (pr && pr.status === PrStatus.APPROVED && pr.departmentId != null) {
        await this.budgetsService.releaseReservedAmount(
          pr.departmentId,
          pr.fiscalYear ?? new Date().getFullYear(),
          pr.quarter, // P5-3: release งบไตรมาสเดียวกับที่ reserve ไว้
          Number(po.totalAmount), // P5-6: reserved สะท้อนยอด PO จริง (ปรับตอน create) ไม่ใช่ PR estimate
        );
      }
    })().catch(() => {});

    void this.auditLogsService.log({
      userId,
      action: 'PO_CANCELLED',
      entityType: 'PurchaseOrder',
      entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status: PoStatus.CANCELLED },
    }).catch(() => {});

    return saved;
  }

  async rateVendor(poId: number, ratedBy: number, dto: RateVendorDto): Promise<VendorRating> {
    const po = await this.poRepository.findOne({ where: { id: poId } });
    if (!po) throw new NotFoundException(`Purchase Order ${poId} not found`);
    if (po.status !== PoStatus.COMPLETED) {
      throw new BadRequestException('Can only rate completed Purchase Orders');
    }

    const existing = await this.ratingRepository.findOne({ where: { poId } });
    if (existing) throw new ConflictException('This Purchase Order has already been rated');

    const rating = this.ratingRepository.create({
      vendorId: po.vendorId,
      poId,
      score: dto.score,
      comment: dto.comment,
      ratedBy,
    });
    let savedRating: VendorRating;
    try {
      savedRating = await this.ratingRepository.save(rating);
    } catch (err) {
      // P4-4: ถ้า 2 request ผ่าน findOne พร้อมกัน DB unique constraint (UQ_vendor_rating_po) จะ reject ตัวที่สอง
      if (err instanceof QueryFailedError && (err as { code?: string }).code === '23505') {
        throw new ConflictException('This Purchase Order has already been rated');
      }
      throw err;
    }

    const avgResult = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.score)', 'avg')
      .where('rating.vendorId = :vendorId', { vendorId: po.vendorId })
      .getRawOne<{ avg: string }>();

    await this.vendorRepository.update(po.vendorId, {
      ratingAvg: Number(parseFloat(avgResult!.avg).toFixed(2)),
    });

    return savedRating;
  }
}
