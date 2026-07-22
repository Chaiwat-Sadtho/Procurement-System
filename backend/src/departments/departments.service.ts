import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
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
    let saved: Department;
    try {
      saved = await this.departmentRepository.save(department);
    } catch (err) {
      // Concurrent creates both pass the findOne check — the unique index catches the second → 409, not 500
      if (err instanceof QueryFailedError && (err as { code?: string }).code === '23505') {
        throw new ConflictException(`Department "${dto.name}" already exists`);
      }
      throw err;
    }
    await this.cache.del(CacheKeys.departments);
    return saved;
  }

  findAll(): Promise<Department[]> {
    return this.cache.getOrSet(CacheKeys.departments, CacheTtl.REFERENCE, () =>
      this.departmentRepository.find({ order: { name: 'ASC' } }),
    );
  }
}
