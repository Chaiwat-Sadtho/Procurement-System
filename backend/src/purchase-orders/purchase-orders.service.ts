import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
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
import { formatRunningNumber, nextRunningSeq } from '../common/running-number';
import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../cache/cache-keys';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

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
    private readonly cache: CacheService,
  ) {}

  private async generatePoNumber(): Promise<string> {
    const year = new Date().getFullYear();
    // Yearly running number: numeric MAX over PO-YYYY-* (row count breaks after DELETE, lexical sort past 9999)
    const rows = await this.poRepository.find({
      where: { poNumber: Like(`PO-${year}-%`) },
      select: { poNumber: true },
    });
    const next = nextRunningSeq(rows.map((r) => r.poNumber));
    return formatRunningNumber('PO', year, next);
  }

  async create(createdBy: number, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const pr = await this.prRepository.findOne({ where: { id: dto.prId } });
    if (!pr) throw new NotFoundException(`Purchase Request ${dto.prId} not found`);
    if (pr.status !== PrStatus.APPROVED) {
      throw new BadRequestException('Can only create PO from approved Purchase Requests');
    }

    // An approved PR converts to a PO exactly once (cancelled POs excepted)
    const existingPo = await this.poRepository.findOne({
      where: { prId: dto.prId, status: Not(PoStatus.CANCELLED) },
    });
    if (existingPo) {
      throw new ConflictException(
        `Purchase Request ${dto.prId} already has an active PO (${existingPo.poNumber})`,
      );
    }

    // A cancelled PO already released the reservation → reserve the full PO amount again, not a delta
    const hadCancelledPo = await this.poRepository.findOne({
      where: { prId: dto.prId, status: PoStatus.CANCELLED },
      select: { id: true },
    });

    const vendor = await this.vendorRepository.findOne({
      where: { id: dto.vendorId },
    });
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

    // The reservation still holds the PR estimate — move it to the real PO total inside the save tx,
    // where exceeding the remaining budget throws and rolls back instead of creating the PO.
    const reserveDelta = Number(totalAmount) - Number(pr.totalEstimatedAmount);

    let savedPo: PurchaseOrder;
    try {
      savedPo = await this.dataSource.transaction(async (manager) => {
        if (hadCancelledPo) {
          await this.budgetsService.reserveAmount(
            prDepartmentId,
            pr.fiscalYear ?? new Date().getFullYear(),
            pr.quarter,
            Number(totalAmount),
            manager,
          );
        } else {
          await this.budgetsService.adjustReservedAmount(
            prDepartmentId,
            pr.fiscalYear ?? new Date().getFullYear(),
            pr.quarter,
            reserveDelta,
            manager,
          );
        }
        const created = await manager.save(PurchaseOrder, po);
        await this.auditLogsService.log(
          {
            userId: createdBy,
            action: 'PO_CREATED',
            entityType: 'PurchaseOrder',
            entityId: created.id,
            newValue: {
              poNumber: created.poNumber,
              prId: dto.prId,
              vendorId: dto.vendorId,
              totalAmount: created.totalAmount,
            },
          },
          manager,
        );
        return created;
      });
    } catch (err) {
      if (err instanceof QueryFailedError && (err as { code?: string }).code === '23505') {
        const constraint = (err as { constraint?: string }).constraint;
        // The DB index catches the duplicate when the app-level check above loses a race
        if (constraint === 'UQ_active_po_per_pr') {
          throw new ConflictException(`Purchase Request ${dto.prId} already has an active PO`);
        }
        // Two concurrent po_number generations collided — let the client retry
        throw new ConflictException('PO number collision, please retry');
      }
      throw err;
    }

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
    })().catch((err) => this.logger.warn('notification failed: PO_CREATED', err));

    return savedPo;
  }

  async findAll(query: PoQueryDto): Promise<{
    data: PurchaseOrder[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, status, vendorId, prId, receivable, withReceipts } = query;

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
    // History filter: POs that already have a GRN — acknowledged has none, unlike `receivable` above
    if (withReceipts)
      qb.andWhere('po.status IN (:...withReceipts)', {
        withReceipts: [PoStatus.PARTIALLY_RECEIVED, PoStatus.COMPLETED],
      });

    const [data, total] = await qb
      .orderBy('po.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({
      where: { id },
      relations: {
        items: true,
        vendor: true,
        purchaseRequest: true,
        createdByUser: true,
      },
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
      // delete-recreate must be atomic — a failed re-save would leave the PO with zero items
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

        // Keep the reserved budget in sync with the edited total; going over throws here → rollback
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
    const saved = await this.dataSource.transaction(async (manager) => {
      const result = await manager.save(PurchaseOrder, po);
      await this.auditLogsService.log(
        {
          userId,
          action: 'PO_ACKNOWLEDGED',
          entityType: 'PurchaseOrder',
          entityId: id,
          oldValue: { status: PoStatus.SENT },
          newValue: { status: PoStatus.ACKNOWLEDGED },
        },
        manager,
      );
      return result;
    });

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
    const saved = await this.dataSource.transaction(async (manager) => {
      const result = await manager.save(PurchaseOrder, po);
      await this.auditLogsService.log(
        {
          userId,
          action: 'PO_CANCELLED',
          entityType: 'PurchaseOrder',
          entityId: id,
          oldValue: { status: oldStatus },
          newValue: { status: PoStatus.CANCELLED },
        },
        manager,
      );

      // Release the PR's reservation inside the cancel tx; COMPLETED POs cannot be cancelled, so this
      // can never double-release against a consume.
      const pr = await manager.findOne(PurchaseRequest, {
        where: { id: po.prId },
        select: {
          id: true,
          departmentId: true,
          fiscalYear: true,
          quarter: true,
          status: true,
        }, // no totalEstimatedAmount: the release uses the real PO total
      });
      if (pr && pr.status === PrStatus.APPROVED && pr.departmentId != null) {
        await this.budgetsService.releaseReservedAmount(
          pr.departmentId,
          pr.fiscalYear ?? new Date().getFullYear(),
          pr.quarter,
          Number(po.totalAmount), // reserved mirrors the real PO total (adjusted at create)
          manager,
        );
      }

      return result;
    });

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
      // Concurrent raters both pass the findOne check — UQ_vendor_rating_po rejects the second
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

    // ratingAvg changed → drop the vendor list cache and this vendor's ratings cache
    await this.cache.invalidateNamespace(CacheKeys.vendorListNs);
    await this.cache.invalidateNamespace(CacheKeys.vendorRatingsNs(po.vendorId));

    return savedRating;
  }

  async findRatingForPo(poId: number): Promise<VendorRating | null> {
    const po = await this.poRepository.findOne({ where: { id: poId } });
    if (!po) throw new NotFoundException(`Purchase Order ${poId} not found`);
    return this.ratingRepository.findOne({ where: { poId } });
  }
}
