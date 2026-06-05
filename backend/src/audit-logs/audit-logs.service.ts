import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

export interface LogParams {
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: LogParams, manager?: EntityManager): Promise<AuditLog> {
    const entry = this.auditLogRepository.create({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
    });
    return manager ? manager.save(AuditLog, entry) : this.auditLogRepository.save(entry);
  }

  async findAll(
    query: AuditLogQueryDto,
  ): Promise<{ data: AuditLog[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page = 1, limit = 50, entityType, entityId, action, userId, from, to } = query;

    const qb = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC');

    if (entityType) qb.andWhere('log.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('log.entityId = :entityId', { entityId });
    if (action) qb.andWhere('log.action = :action', { action });
    if (userId) qb.andWhere('log.userId = :userId', { userId });
    if (from) qb.andWhere('log.createdAt >= :from', { from: new Date(from) });
    if (to) qb.andWhere('log.createdAt <= :to', { to: new Date(to) });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
