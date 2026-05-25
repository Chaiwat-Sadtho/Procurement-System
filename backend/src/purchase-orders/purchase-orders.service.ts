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
  ) {}

  private async generatePoNumber(): Promise<string> {
    const year = new Date().getFullYear();
    // นับเฉพาะ PO ของปีปัจจุบัน (prefix PO-YYYY-) เพื่อ reset running number รายปี (P2-3/S-3)
    const count = await this.poRepository.count({ where: { poNumber: Like(`PO-${year}-%`) } });
    return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
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
        totalPrice: Number((item.quantity * item.unitPrice).toFixed(2)),
        receivedQuantity: 0,
      }),
    );

    const totalAmount = Number(
      items.reduce((sum, item) => sum + Number(item.totalPrice), 0).toFixed(2),
    );

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

    try {
      return await this.poRepository.save(po);
    } catch (err) {
      // ถ้า 2 request gen po_number ชนกัน DB unique constraint จะ reject ตัวที่สอง — ให้ client retry
      if (err instanceof QueryFailedError && (err as { code?: string }).code === '23505') {
        throw new ConflictException('PO number collision, please retry');
      }
      throw err;
    }
  }

  async findAll(
    query: PoQueryDto,
  ): Promise<{ data: PurchaseOrder[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page = 1, limit = 20, status, vendorId, prId } = query;

    const qb = this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.items', 'items')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .leftJoinAndSelect('po.purchaseRequest', 'pr');

    if (status) qb.andWhere('po.status = :status', { status });
    if (vendorId) qb.andWhere('po.vendorId = :vendorId', { vendorId });
    if (prId) qb.andWhere('po.prId = :prId', { prId });

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
    const po = await this.poRepository.findOne({ where: { id }, relations: { items: true } });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    if (po.status !== PoStatus.DRAFT) throw new BadRequestException('Only draft POs can be edited');

    if (dto.expectedDeliveryDate) po.expectedDeliveryDate = dto.expectedDeliveryDate;
    if (dto.notes !== undefined) po.notes = dto.notes;

    if (dto.items) {
      // delete-recreate ของ items ต้อง atomic — ถ้า save ใหม่ล้มหลัง delete ไปแล้ว PO จะเหลือ 0 item
      const items = dto.items;
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
            totalPrice: Number((item.quantity * item.unitPrice).toFixed(2)),
            receivedQuantity: 0,
          }),
        );
        po.items = await manager.save(PurchaseOrderItem, newItems);
        po.totalAmount = Number(
          po.items.reduce((sum, item) => sum + Number(item.totalPrice), 0).toFixed(2),
        );
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

  async acknowledge(id: number): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    if (po.status !== PoStatus.SENT) {
      throw new BadRequestException('Only sent POs can be acknowledged');
    }
    po.status = PoStatus.ACKNOWLEDGED;
    return this.poRepository.save(po);
  }

  async cancel(id: number): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    if (po.status === PoStatus.COMPLETED) {
      throw new BadRequestException('Completed POs cannot be cancelled');
    }
    if (po.status === PoStatus.CANCELLED) {
      throw new BadRequestException('PO is already cancelled');
    }
    po.status = PoStatus.CANCELLED;
    return this.poRepository.save(po);
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
