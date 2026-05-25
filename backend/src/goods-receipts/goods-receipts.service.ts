import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Like, QueryFailedError } from 'typeorm';
import { GoodsReceiptNote, GrnStatus } from './entities/goods-receipt-note.entity';
import { GoodsReceiptItem, ItemCondition } from './entities/goods-receipt-item.entity';
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
