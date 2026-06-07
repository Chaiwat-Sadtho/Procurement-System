import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorCategory } from './entities/vendor-category.entity';
import { CreateVendorCategoryDto } from './dto/create-vendor-category.dto';

@Injectable()
export class VendorCategoriesService {
  constructor(
    @InjectRepository(VendorCategory)
    private readonly categoryRepository: Repository<VendorCategory>,
  ) {}

  async create(dto: CreateVendorCategoryDto): Promise<VendorCategory> {
    const existing = await this.categoryRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException(`Category "${dto.name}" already exists`);

    const category = this.categoryRepository.create({ name: dto.name });
    return this.categoryRepository.save(category);
  }

  findAll(): Promise<VendorCategory[]> {
    return this.categoryRepository.find({ order: { name: 'ASC' } });
  }

  findOne(id: number): Promise<VendorCategory | null> {
    return this.categoryRepository.findOne({ where: { id } });
  }
}
