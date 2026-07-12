import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { VendorCategory } from './entities/vendor-category.entity';
import { VendorRating } from './entities/vendor-rating.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { BlacklistVendorDto } from './dto/blacklist-vendor.dto';
import { VendorQueryDto } from './dto/vendor-query.dto';
import { VendorRatingQueryDto } from './dto/vendor-rating-query.dto';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTtl, hashQuery } from '../cache/cache-keys';

interface RawRatingRow {
  id: number;
  vendorId: number;
  poId: number;
  score: number;
  comment: string | null;
  createdAt: Date;
  poNumber: string;
  raterId: number;
  raterFirstName: string | null;
  raterMiddleName: string | null;
  raterLastName: string | null;
}

type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

type VendorListResult = { data: Vendor[]; meta: PaginationMeta };

type VendorRatingsResult = {
  data: Array<{
    id: number;
    vendorId: number;
    poId: number;
    purchaseOrder: { id: number; poNumber: string };
    score: number;
    comment: string | null;
    ratedBy: { id: number; fullName: string };
    createdAt: Date;
  }>;
  meta: PaginationMeta;
};

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(VendorCategory)
    private readonly categoryRepository: Repository<VendorCategory>,
    @InjectRepository(VendorRating)
    private readonly ratingRepository: Repository<VendorRating>,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateVendorDto): Promise<Vendor> {
    if (dto.taxId) {
      const existing = await this.vendorRepository.findOne({
        where: { taxId: dto.taxId },
      });
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
      vendor.categories = await this.categoryRepository.findBy({
        id: In(dto.categoryIds),
      });
    }

    const saved = await this.vendorRepository.save(vendor);
    await this.cache.invalidateNamespace(CacheKeys.vendorListNs);
    return saved;
  }

  // The cached payload round-trips through Redis as JSON: on a hit, Vendor instances
  // come back as plain objects and Date columns as ISO strings. That is lossless here
  // ONLY because Vendor has no @Expose getters or @Transform members, so
  // ClassSerializerInterceptor emits identical JSON on hit and miss — unlike /auth/me,
  // which must re-hydrate via plainToInstance (see AuthService.getProfile). Adding an
  // @Expose/@Transform member to Vendor would require re-hydrating here too.
  findAll(query: VendorQueryDto): Promise<VendorListResult> {
    return this.cache.getOrSetNamespaced(
      CacheKeys.vendorListNs,
      hashQuery({ ...query }),
      CacheTtl.VENDOR_LIST,
      () => this.queryVendors(query),
    );
  }

  private async queryVendors(query: VendorQueryDto): Promise<VendorListResult> {
    const { page = 1, limit = 20, search, isBlacklisted, categoryId } = query;

    const qb = this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.categories', 'categories');

    if (search) qb.andWhere('vendor.name ILIKE :search', { search: `%${search}%` });
    if (isBlacklisted !== undefined) {
      qb.andWhere('vendor.isBlacklisted = :isBlacklisted', { isBlacklisted });
    }
    // filter ด้วย subquery แทน andWhere บน select join เพื่อไม่ให้ categories array ของ vendor ถูกตัดเหลือเฉพาะ category ที่ match
    if (categoryId) {
      qb.andWhere(
        (qb2) => {
          const sub = qb2
            .subQuery()
            .select('fc.vendor_id')
            .from('vendor_category_mappings', 'fc')
            .where('fc.category_id = :categoryId')
            .getQuery();
          return `vendor.id IN ${sub}`;
        },
        { categoryId },
      );
    }

    const [data, total] = await qb
      .orderBy('vendor.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
      relations: { categories: true },
    });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  findRatings(id: number, query: VendorRatingQueryDto): Promise<VendorRatingsResult> {
    return this.cache.getOrSetNamespaced(
      CacheKeys.vendorRatingsNs(id),
      hashQuery({ ...query }),
      CacheTtl.VENDOR_RATINGS,
      () => this.queryRatings(id, query),
    );
  }

  private async queryRatings(
    id: number,
    query: VendorRatingQueryDto,
  ): Promise<VendorRatingsResult> {
    await this.findOne(id); // 404 if vendor missing

    const { page = 1, limit = 20 } = query;

    const rows = await this.ratingRepository
      .createQueryBuilder('rating')
      .leftJoin('purchase_orders', 'po', 'po.id = rating.po_id')
      .leftJoin('users', 'rater', 'rater.id = rating.rated_by')
      .select([
        'rating.id AS id',
        'rating.vendor_id AS "vendorId"',
        'rating.po_id AS "poId"',
        'rating.score AS score',
        'rating.comment AS comment',
        'rating.created_at AS "createdAt"',
        'po.po_number AS "poNumber"',
        'rater.id AS "raterId"',
        'rater.first_name AS "raterFirstName"',
        'rater.middle_name AS "raterMiddleName"',
        'rater.last_name AS "raterLastName"',
      ])
      .where('rating.vendor_id = :id', { id })
      .orderBy('rating.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<RawRatingRow>();

    const total = await this.ratingRepository.count({
      where: { vendorId: id },
    });

    const data = rows.map((r) => ({
      id: r.id,
      vendorId: r.vendorId,
      poId: r.poId,
      purchaseOrder: { id: r.poId, poNumber: r.poNumber },
      score: r.score,
      comment: r.comment,
      ratedBy: {
        id: r.raterId,
        // Denormalized name snapshot. This payload is cached under vendorRatingsNs
        // (TTL VENDOR_RATINGS = 120s) and is intentionally NOT invalidated when the rater
        // renames via AuthService.updateProfile. A hit may therefore show the old name for
        // up to the TTL — accepted as bounded, self-healing, display-only staleness.
        fullName: [r.raterFirstName, r.raterMiddleName, r.raterLastName].filter(Boolean).join(' '),
      },
      createdAt: r.createdAt,
    }));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: number, dto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);

    if (dto.taxId && dto.taxId !== vendor.taxId) {
      const existing = await this.vendorRepository.findOne({
        where: { taxId: dto.taxId },
      });
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

    const saved = await this.vendorRepository.save(vendor);
    await this.cache.invalidateNamespace(CacheKeys.vendorListNs);
    return saved;
  }

  async blacklist(id: number, dto: BlacklistVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);
    if (vendor.isBlacklisted) throw new BadRequestException('Vendor is already blacklisted');

    vendor.isBlacklisted = true;
    vendor.blacklistReason = dto.reason;
    const saved = await this.vendorRepository.save(vendor);
    await this.cache.invalidateNamespace(CacheKeys.vendorListNs);
    return saved;
  }

  async unblacklist(id: number): Promise<Vendor> {
    const vendor = await this.findOne(id);
    if (!vendor.isBlacklisted) throw new BadRequestException('Vendor is not blacklisted');

    vendor.isBlacklisted = false;
    vendor.blacklistReason = null;
    const saved = await this.vendorRepository.save(vendor);
    await this.cache.invalidateNamespace(CacheKeys.vendorListNs);
    return saved;
  }
}
