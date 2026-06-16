import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { requireManagerDepartmentId } from '../common/manager-scope';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../cache/cache-keys';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cache: CacheService,
  ) {}

  async findAll(currentUser: { role: UserRole; departmentId: number | null }): Promise<User[]> {
    if (currentUser.role === UserRole.PROCUREMENT_OFFICER) {
      return this.userRepository.find({
        relations: { department: true },
        order: { createdAt: 'DESC' },
      });
    }
    if (currentUser.role === UserRole.MANAGER) {
      // dept จาก auth payload (requireManagerDepartmentId) — ใช้ helper ร่วมกับ budgets/PR (กัน logic ซ้ำ)
      const departmentId = requireManagerDepartmentId(currentUser);
      return this.userRepository.find({
        where: { departmentId },
        relations: { department: true },
        order: { createdAt: 'DESC' },
      });
    }
    throw new ForbiddenException('Insufficient role to list users');
  }

  async updateRole(id: number, dto: UpdateRoleDto, actorId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (id === actorId) {
      throw new ForbiddenException('Cannot change your own role');
    }
    const isDemotingPo =
      user.role === UserRole.PROCUREMENT_OFFICER && dto.role !== UserRole.PROCUREMENT_OFFICER;
    if (isDemotingPo) await this.assertNotLastActivePo();
    user.role = dto.role;
    const saved = await this.userRepository.save(user);
    // role is embedded in the cached /auth/me payload → drop it so the target re-reads fresh
    await this.cache.del(CacheKeys.authMe(id));
    return saved;
  }

  async updateStatus(id: number, dto: UpdateStatusDto, actorId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (id === actorId && !dto.isActive) {
      throw new ForbiddenException('Cannot deactivate yourself');
    }
    const isDeactivatingActivePo =
      !dto.isActive && user.isActive && user.role === UserRole.PROCUREMENT_OFFICER;
    if (isDeactivatingActivePo) await this.assertNotLastActivePo();
    user.isActive = dto.isActive;
    const saved = await this.userRepository.save(user);
    // isActive is embedded in the cached /auth/me payload → drop it so the target re-reads fresh
    await this.cache.del(CacheKeys.authMe(id));
    return saved;
  }

  private async assertNotLastActivePo(): Promise<void> {
    const activePoCount = await this.userRepository.count({
      where: { role: UserRole.PROCUREMENT_OFFICER, isActive: true },
    });
    if (activePoCount <= 1) {
      throw new BadRequestException('Cannot remove the last active procurement officer');
    }
  }
}
