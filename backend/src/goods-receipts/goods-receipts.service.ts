import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Like, QueryFailedError } from 'typeorm';
import { GoodsReceiptNote, GrnStatus } from './entities/goods-receipt-note.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { PurchaseOrder, PoStatus } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../purchase-orders/entities/purchase-order-item.entity';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { GrnQueryDto } from './dto/grn-query.dto';

const RECEIVABLE_STATUSES = [PoStatus.ACKNOWLEDGED, PoStatus.PARTIALLY_RECEIVED];

@Injectable()
export class GoodsReceiptsService {
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
  ) {}

  async create(receivedBy: number, dto: CreateGoodsReceiptDto): Promise<GoodsReceiptNote> {
    return this.dataSource.transaction(async (manager) => {
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

      // 2. Generate GRN number — นับเฉพาะ GRN ของปีปัจจุบัน (prefix GRN-YYYY-) เพื่อ reset running number รายปี
      const year = new Date().getFullYear();
      const count = await manager.count(GoodsReceiptNote, {
        where: { grnNumber: Like(`GRN-${year}-%`) },
      });
      const grnNumber = `GRN-${year}-${String(count + 1).padStart(4, '0')}`;

      // 3. Build and validate GRN items
      const grnItems = dto.items.map((dtoItem) => {
        const poItem = po.items.find((i) => i.id === dtoItem.poItemId);
        if (!poItem) {
          throw new BadRequestException(
            `PO item ${dtoItem.poItemId} not found in PO ${dto.poId}`,
          );
        }
        // P4-3: กันรับของเกินจำนวนที่สั่ง (received สะสม + ที่รับครั้งนี้ ต้องไม่เกิน ordered)
        const totalAfterReceipt = Number(poItem.receivedQuantity) + Number(dtoItem.receivedQuantity);
        if (totalAfterReceipt > Number(poItem.quantity)) {
          throw new BadRequestException(
            `Over-receipt for item "${poItem.itemName}": ordered ${poItem.quantity}, ` +
              `already received ${poItem.receivedQuantity}, cannot receive ${dtoItem.receivedQuantity} more`,
          );
        }
        return manager.create(GoodsReceiptItem, {
          poItemId: dtoItem.poItemId,
          receivedQuantity: dtoItem.receivedQuantity,
          condition: dtoItem.condition,
        });
      });

      // 4. Save GRN
      const grnData = manager.create(GoodsReceiptNote, {
        grnNumber,
        poId: dto.poId,
        receivedBy,
        receivedDate: dto.receivedDate,
        notes: dto.notes,
        items: grnItems,
        status: GrnStatus.PARTIAL, // determined after checking quantities below
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

      // 5. Update po_item.received_quantity for each item
      for (const dtoItem of dto.items) {
        const poItem = po.items.find((i) => i.id === dtoItem.poItemId);
        if (!poItem) continue; // validated in step 3 — guard for strict null safety
        poItem.receivedQuantity = Number(
          (Number(poItem.receivedQuantity) + dtoItem.receivedQuantity).toFixed(2),
        );
        await manager.save(PurchaseOrderItem, poItem);
      }

      // 6. Re-check all items to determine final PO status
      const allReceived = po.items.every(
        (item) => Number(item.receivedQuantity) >= Number(item.quantity),
      );

      po.status = allReceived ? PoStatus.COMPLETED : PoStatus.PARTIALLY_RECEIVED;
      if (allReceived) po.actualDeliveryDate = dto.receivedDate;
      await manager.save(PurchaseOrder, po);

      // Update GRN status to reflect actual receipt completeness
      savedGrn.status = allReceived ? GrnStatus.COMPLETE : GrnStatus.PARTIAL;
      await manager.save(GoodsReceiptNote, savedGrn);

      return savedGrn;
    });
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
