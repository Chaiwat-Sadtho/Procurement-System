import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
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
import { formatRunningNumber, nextRunningSeq } from '../common/running-number';

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

      // Yearly running number: numeric MAX over GRN-YYYY-* (row count breaks after DELETE, lexical sort past 9999)
      const year = new Date().getFullYear();
      const grnRows = await manager.find(GoodsReceiptNote, {
        where: { grnNumber: Like(`GRN-${year}-%`) },
        select: { grnNumber: true },
      });
      const nextGrn = nextRunningSeq(grnRows.map((r) => r.grnNumber));
      const grnNumber = formatRunningNumber('GRN', year, nextGrn);

      // Accumulate per PO item so repeated poItemId lines in one payload cannot bypass the over-receipt guard
      const effectiveByPoItem = new Map<number, number>();
      const grnItems = dto.items.map((dtoItem) => {
        const poItem = po.items.find((i) => i.id === dtoItem.poItemId);
        if (!poItem) {
          throw new BadRequestException(`PO item ${dtoItem.poItemId} not found in PO ${dto.poId}`);
        }
        // Damaged goods are not counted as received — only condition=good adds to receivedQuantity
        const effectiveQty =
          dtoItem.condition === ItemCondition.GOOD ? Number(dtoItem.receivedQuantity) : 0;
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

      // Apply in memory first so the GRN is saved once, already carrying the right status
      for (const poItem of po.items) {
        const received = effectiveByPoItem.get(poItem.id);
        if (received === undefined) continue;
        poItem.receivedQuantity = Number((Number(poItem.receivedQuantity) + received).toFixed(2));
      }
      const allReceived = po.items.every(
        (item) => Number(item.receivedQuantity) >= Number(item.quantity),
      );

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
        // Two concurrent grn_number generations collided — let the client retry
        if (err instanceof QueryFailedError && (err as { code?: string }).code === '23505') {
          throw new ConflictException('GRN number collision, please retry');
        }
        throw err;
      }

      for (const poItem of po.items) {
        if (effectiveByPoItem.has(poItem.id)) {
          await manager.save(PurchaseOrderItem, poItem);
        }
      }
      po.status = allReceived ? PoStatus.COMPLETED : PoStatus.PARTIALLY_RECEIVED;
      if (allReceived) po.actualDeliveryDate = dto.receivedDate;
      await manager.save(PurchaseOrder, po);

      if (allReceived) {
        const prData = await manager.findOne(PurchaseRequest, {
          where: { id: po.prId },
          select: {
            id: true,
            departmentId: true,
            fiscalYear: true,
            quarter: true,
            totalEstimatedAmount: true,
          },
        });
        if (prData && prData.departmentId != null) {
          // The fiscal year pinned at approval, so this consumes the same row the PR reserved
          await this.budgetsService.consumeAmount(
            prData.departmentId,
            prData.fiscalYear ?? new Date().getFullYear(),
            prData.quarter,
            Number(po.totalAmount), // reserved mirrors the real PO total (adjusted at create)
            Number(po.totalAmount),
            manager,
          );
        } else {
          // Should be unreachable (every PO comes from a PR). Log instead of throwing so a valid GRN
          // is not rolled back — the reservation stays until someone investigates.
          this.logger.warn(
            `PO ${po.id} completed but PR ${po.prId} has no department/not found — budget not consumed`,
          );
        }
      }

      await this.auditLogsService.log(
        {
          userId: receivedBy,
          action: 'GRN_CREATED',
          entityType: 'GoodsReceiptNote',
          entityId: savedGrn.id,
          newValue: {
            grnNumber: savedGrn.grnNumber,
            poId: dto.poId,
            poCompleted: allReceived,
          },
        },
        manager,
      );

      return { grn: savedGrn, poCompleted: allReceived };
    });

    // Best-effort, after the transaction commits
    if (poCompleted) {
      void this.notificationsService
        .send({
          userId: receivedBy,
          title: 'PO รับของครบแล้ว',
          message: `GRN ${grn.grnNumber} บันทึกแล้ว — PO รับของครบแล้ว`,
          type: NotificationType.GRN_CREATED,
          referenceId: grn.id,
          referenceType: 'GoodsReceiptNote',
        })
        .catch((err) => this.logger.warn('notification failed: GRN_CREATED', err));
    }

    return grn;
  }

  async findAll(query: GrnQueryDto): Promise<{
    data: GoodsReceiptNote[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, poId, status } = query;

    const qb = this.grnRepository
      .createQueryBuilder('grn')
      .leftJoinAndSelect('grn.items', 'items')
      .leftJoinAndSelect('grn.purchaseOrder', 'po');

    if (poId) qb.andWhere('grn.poId = :poId', { poId });
    if (status) qb.andWhere('grn.status = :status', { status });

    const [data, total] = await qb
      .orderBy('grn.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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
