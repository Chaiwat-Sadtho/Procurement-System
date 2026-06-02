import {
  Injectable, Logger, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Like, QueryFailedError } from 'typeorm';
import { GoodsReceiptNote, GrnStatus } from './entities/goods-receipt-note.entity';
import { GoodsReceiptItem, ItemCondition } from './entities/goods-receipt-item.entity';
import { PurchaseOrder, PoStatus } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../purchase-orders/entities/purchase-order-item.entity';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { GrnQueryDto } from './dto/grn-query.dto';
import { PurchaseRequest } from '../purchase-requests/entities/purchase-request.entity';
import { BudgetsService } from '../budgets/budgets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { formatRunningNumber } from '../common/running-number';

const RECEIVABLE_STATUSES = [PoStatus.ACKNOWLEDGED, PoStatus.PARTIALLY_RECEIVED];

@Injectable()
export class GoodsReceiptsService {
  private readonly logger = new Logger(GoodsReceiptsService.name);

  constructor(
    @InjectRepository(GoodsReceiptNote)
    private readonly grnRepository: Repository<GoodsReceiptNote>,
    @InjectRepository(GoodsReceiptItem)
    private readonly grnItemRepository: Repository<GoodsReceiptItem>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly poItemRepository: Repository<PurchaseOrderItem>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly budgetsService: BudgetsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(receivedBy: number, dto: CreateGoodsReceiptDto): Promise<GoodsReceiptNote> {
    const { grn, poCompleted } = await this.dataSource.transaction(async (manager) => {
      // 1. Fetch PO with items inside transaction
      const po = await manager.findOne(PurchaseOrder, {
        where: { id: dto.poId },
        relations: { items: true },
      });
      if (!po) throw new NotFoundException(`Purchase Order ${dto.poId} not found`);
      if (!RECEIVABLE_STATUSES.includes(po.status)) {
        throw new BadRequestException(
          `PO must be acknowledged or partially_received to record goods receipt (current: ${po.status})`,
        );
      }

      // 2. Generate GRN number — ดึงเลขล่าสุดของปี (MAX) แทนการนับแถว เพราะหลัง DELETE count จะต่ำกว่า suffix สูงสุด → gen ซ้ำ → 23505.
      // suffix zero-padded 4 หลัก ดังนั้น ORDER BY lexical = numeric order ภายใน prefix ปีเดียวกัน (อยู่ใน transaction เดียวกัน)
      const year = new Date().getFullYear();
      const latestGrn = await manager.findOne(GoodsReceiptNote, {
        where: { grnNumber: Like(`GRN-${year}-%`) },
        order: { grnNumber: 'DESC' },
        select: { id: true, grnNumber: true },
      });
      const nextGrn = latestGrn ? parseInt(latestGrn.grnNumber.slice(-4), 10) + 1 : 1;
      const grnNumber = formatRunningNumber('GRN', year, nextGrn);

      // 3. Validate GRN items + สะสม effective qty ต่อ po item (กัน poItemId ซ้ำใน payload เดียว bypass guard P4-3)
      const effectiveByPoItem = new Map<number, number>();
      const grnItems = dto.items.map((dtoItem) => {
        const poItem = po.items.find((i) => i.id === dtoItem.poItemId);
        if (!poItem) {
          throw new BadRequestException(
            `PO item ${dtoItem.poItemId} not found in PO ${dto.poId}`,
          );
        }
        // ของชำรุดไม่นับเป็นของที่รับจริง — เฉพาะ condition=good เท่านั้นที่นับเข้า receivedQuantity
        const effectiveQty =
          dtoItem.condition === ItemCondition.GOOD ? Number(dtoItem.receivedQuantity) : 0;
        // P4-3: ordered ต้องคลุม received สะสมเดิม + ของที่รับใน payload นี้ทั้งหมด (รวมบรรทัดซ้ำ poItemId เดียวกัน)
        const priorInRequest = effectiveByPoItem.get(dtoItem.poItemId) ?? 0;
        const totalAfterReceipt = Number(poItem.receivedQuantity) + priorInRequest + effectiveQty;
        if (totalAfterReceipt > Number(poItem.quantity)) {
          throw new BadRequestException(
            `Over-receipt for item "${poItem.itemName}": ordered ${poItem.quantity}, ` +
              `already received ${poItem.receivedQuantity}, cannot receive ${priorInRequest + effectiveQty} more`,
          );
        }
        effectiveByPoItem.set(dtoItem.poItemId, priorInRequest + effectiveQty);
        return manager.create(GoodsReceiptItem, {
          poItemId: dtoItem.poItemId,
          receivedQuantity: dtoItem.receivedQuantity,
          condition: dtoItem.condition,
        });
      });

      // 4. ปรับ received_quantity ใน memory แล้วสรุปสถานะ PO ก่อนเขียน DB (เขียน GRN status ครั้งเดียว)
      for (const poItem of po.items) {
        const received = effectiveByPoItem.get(poItem.id);
        if (received === undefined) continue;
        poItem.receivedQuantity = Number((Number(poItem.receivedQuantity) + received).toFixed(2));
      }
      const allReceived = po.items.every(
        (item) => Number(item.receivedQuantity) >= Number(item.quantity),
      );

      // 5. Save GRN ครั้งเดียวด้วยสถานะที่ถูกต้อง
      const grnData = manager.create(GoodsReceiptNote, {
        grnNumber,
        poId: dto.poId,
        receivedBy,
        receivedDate: dto.receivedDate,
        notes: dto.notes,
        items: grnItems,
        status: allReceived ? GrnStatus.COMPLETE : GrnStatus.PARTIAL,
      });
      let savedGrn: GoodsReceiptNote;
      try {
        savedGrn = await manager.save(GoodsReceiptNote, grnData);
      } catch (err) {
        // ถ้า 2 request gen grn_number ชนกัน DB unique constraint จะ reject ตัวที่สอง — ให้ client retry
        if (err instanceof QueryFailedError && (err as { code?: string }).code === '23505') {
          throw new ConflictException('GRN number collision, please retry');
        }
        throw err;
      }

      // 6. persist received_quantity ของ po items + สถานะ PO
      for (const poItem of po.items) {
        if (effectiveByPoItem.has(poItem.id)) {
          await manager.save(PurchaseOrderItem, poItem);
        }
      }
      po.status = allReceived ? PoStatus.COMPLETED : PoStatus.PARTIALLY_RECEIVED;
      if (allReceived) po.actualDeliveryDate = dto.receivedDate;
      await manager.save(PurchaseOrder, po);

      // 7. เมื่อรับของครบ — consume budget ภายใน transaction เดียวกัน
      if (allReceived) {
        const prData = await manager.findOne(PurchaseRequest, {
          where: { id: po.prId },
          select: { id: true, departmentId: true, fiscalYear: true, quarter: true, totalEstimatedAmount: true },
        });
        if (prData && prData.departmentId != null) {
          // P5-5: ใช้ fiscalYear ที่ตรึงไว้ตอน approve เพื่อ consume budget row เดียวกับที่ reserve
          await this.budgetsService.consumeAmount(
            prData.departmentId,
            prData.fiscalYear ?? new Date().getFullYear(),
            prData.quarter, // P5-3: consume งบไตรมาสเดียวกับที่ reserve
            Number(po.totalAmount), // P5-6: reserved สะท้อนยอด PO จริง (ปรับตอน create) → release ยอด PO ไม่ใช่ PR estimate
            Number(po.totalAmount),
            manager,
          );
        } else {
          // ไม่ควรเกิด — PO ทุกตัวมาจาก PR จริง (UQ_active_po_per_pr). ถ้าเกิด = ข้อมูลเพี้ยน
          // และ reserved budget จะค้างไม่ถูก release จึง log ไว้ debug (ไม่ throw เพื่อไม่ rollback GRN ที่ถูกต้อง)
          this.logger.warn(
            `PO ${po.id} completed but PR ${po.prId} has no department/not found — budget not consumed`,
          );
        }
      }

      return { grn: savedGrn, poCompleted: allReceived };
    });

    // audit + notification หลัง transaction commit (fire-and-forget)
    void this.auditLogsService.log({
      userId: receivedBy,
      action: 'GRN_CREATED',
      entityType: 'GoodsReceiptNote',
      entityId: grn.id,
      newValue: { grnNumber: grn.grnNumber, poId: dto.poId, poCompleted },
    }).catch(() => {});

    if (poCompleted) {
      void this.notificationsService.send({
        userId: receivedBy,
        title: 'PO รับของครบแล้ว',
        message: `GRN ${grn.grnNumber} บันทึกแล้ว — PO รับของครบแล้ว`,
        type: NotificationType.GRN_CREATED,
        referenceId: grn.id,
        referenceType: 'GoodsReceiptNote',
      }).catch(() => {});
    }

    return grn;
  }

  async findAll(
    query: GrnQueryDto,
  ): Promise<{ data: GoodsReceiptNote[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page = 1, limit = 20, poId } = query;

    const qb = this.grnRepository
      .createQueryBuilder('grn')
      .leftJoinAndSelect('grn.items', 'items')
      .leftJoinAndSelect('grn.purchaseOrder', 'po');

    if (poId) qb.andWhere('grn.poId = :poId', { poId });

    const [data, total] = await qb
      .orderBy('grn.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number): Promise<GoodsReceiptNote> {
    const grn = await this.grnRepository.findOne({
      where: { id },
      relations: { items: { poItem: true }, purchaseOrder: true },
    });
    if (!grn) throw new NotFoundException(`Goods Receipt ${id} not found`);
    return grn;
  }

  async findByPo(poId: number): Promise<GoodsReceiptNote[]> {
    return this.grnRepository.find({
      where: { poId },
      relations: { items: true },
      order: { createdAt: 'ASC' },
    });
  }
}
