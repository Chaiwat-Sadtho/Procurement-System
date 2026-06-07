import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTtl } from '../cache/cache-keys';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.departmentRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Department "${dto.name}" already exists`);
    }
    const department = this.departmentRepository.create(dto);
    const saved = await this.departmentRepository.save(department);
    await this.cache.del(CacheKeys.departments);
    return saved;
  }

  findAll(): Promise<Department[]> {
    return this.cache.getOrSet(CacheKeys.departments, CacheTtl.REFERENCE, () =>
      this.departmentRepository.find({ order: { name: 'ASC' } }),
    );
  }
}
