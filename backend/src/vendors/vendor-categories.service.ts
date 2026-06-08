import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorCategory } from './entities/vendor-category.entity';
import { CreateVendorCategoryDto } from './dto/create-vendor-category.dto';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTtl } from '../cache/cache-keys';

@Injectable()
export class VendorCategoriesService {
  constructor(
    @InjectRepository(VendorCategory)
    private readonly categoryRepository: Repository<VendorCategory>,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateVendorCategoryDto): Promise<VendorCategory> {
    const existing = await this.categoryRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException(`Category "${dto.name}" already exists`);

    const category = this.categoryRepository.create({ name: dto.name });
    const saved = await this.categoryRepository.save(category);
    await this.cache.del(CacheKeys.vendorCategories);
    return saved;
  }

  findAll(): Promise<VendorCategory[]> {
    return this.cache.getOrSet(CacheKeys.vendorCategories, CacheTtl.REFERENCE, () =>
      this.categoryRepository.find({ order: { name: 'ASC' } }),
    );
  }

  findOne(id: number): Promise<VendorCategory | null> {
    return this.categoryRepository.findOne({ where: { id } });
  }
}
