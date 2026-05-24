import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { VendorCategory } from './entities/vendor-category.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { BlacklistVendorDto } from './dto/blacklist-vendor.dto';
import { VendorQueryDto } from './dto/vendor-query.dto';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(VendorCategory)
    private readonly categoryRepository: Repository<VendorCategory>,
  ) {}

  async create(dto: CreateVendorDto): Promise<Vendor> {
    if (dto.taxId) {
      const existing = await this.vendorRepository.findOne({ where: { taxId: dto.taxId } });
      if (existing) throw new ConflictException(`Vendor with tax ID ${dto.taxId} already exists`);
    }

    const vendor = this.vendorRepository.create({
      name: dto.name,
      taxId: dto.taxId,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
    });

    if (dto.categoryIds?.length) {
      vendor.categories = await this.categoryRepository.findBy({ id: In(dto.categoryIds) });
    }

    return this.vendorRepository.save(vendor);
  }

  async findAll(
    query: VendorQueryDto,
  ): Promise<{ data: Vendor[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page = 1, limit = 20, search, isBlacklisted, categoryId } = query;

    const qb = this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.categories', 'categories');

    if (search) qb.andWhere('vendor.name ILIKE :search', { search: `%${search}%` });
    if (isBlacklisted !== undefined) {
      qb.andWhere('vendor.isBlacklisted = :isBlacklisted', { isBlacklisted });
    }
    // filter ด้วย subquery แทน andWhere บน select join เพื่อไม่ให้ categories array ของ vendor ถูกตัดเหลือเฉพาะ category ที่ match (P3-2)
    if (categoryId) {
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('fc.vendor_id')
          .from('vendor_category_mappings', 'fc')
          .where('fc.category_id = :categoryId')
          .getQuery();
        return `vendor.id IN ${sub}`;
      }, { categoryId });
    }

    const [data, total] = await qb
      .orderBy('vendor.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
      relations: { categories: true },
    });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async update(id: number, dto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);

    if (dto.taxId && dto.taxId !== vendor.taxId) {
      const existing = await this.vendorRepository.findOne({ where: { taxId: dto.taxId } });
      if (existing) throw new ConflictException(`Vendor with tax ID ${dto.taxId} already exists`);
    }

    if (dto.name !== undefined) vendor.name = dto.name;
    if (dto.taxId !== undefined) vendor.taxId = dto.taxId;
    if (dto.email !== undefined) vendor.email = dto.email;
    if (dto.phone !== undefined) vendor.phone = dto.phone;
    if (dto.address !== undefined) vendor.address = dto.address;

    if (dto.categoryIds !== undefined) {
      vendor.categories = dto.categoryIds.length
        ? await this.categoryRepository.findBy({ id: In(dto.categoryIds) })
        : [];
    }

    return this.vendorRepository.save(vendor);
  }

  async blacklist(id: number, dto: BlacklistVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);
    if (vendor.isBlacklisted) throw new BadRequestException('Vendor is already blacklisted');

    vendor.isBlacklisted = true;
    vendor.blacklistReason = dto.reason;
    return this.vendorRepository.save(vendor);
  }

  async unblacklist(id: number): Promise<Vendor> {
    const vendor = await this.findOne(id);
    if (!vendor.isBlacklisted) throw new BadRequestException('Vendor is not blacklisted');

    vendor.isBlacklisted = false;
    vendor.blacklistReason = null;
    return this.vendorRepository.save(vendor);
  }
}
