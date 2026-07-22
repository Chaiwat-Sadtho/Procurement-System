import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTtl } from '../cache/cache-keys';

export interface PublicAnnouncement {
  id: number;
  title: string;
  detail: string;
  icon: string;
  isPinned: boolean;
}

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly repo: Repository<Announcement>,
    private readonly cache: CacheService,
  ) {}

  // Public login-page list: active only, pinned first. Cached as a plain array (JSON round-trip safe)
  // and invalidated by every write.
  findActive(): Promise<PublicAnnouncement[]> {
    return this.cache.getOrSetNamespaced(
      CacheKeys.announcementPublicNs,
      'active',
      CacheTtl.ANNOUNCEMENTS_PUBLIC,
      async () => {
        const rows = await this.repo.find({
          where: { isActive: true },
          order: { isPinned: 'DESC', createdAt: 'DESC' },
        });
        return rows.map((a) => ({
          id: a.id,
          title: a.title,
          detail: a.detail,
          icon: a.icon,
          isPinned: a.isPinned,
        }));
      },
    );
  }

  // Admin list: includes inactive rows and is not cached (low traffic, must be fresh)
  findAll(): Promise<Announcement[]> {
    return this.repo.find({ order: { isPinned: 'DESC', createdAt: 'DESC' } });
  }

  async create(dto: CreateAnnouncementDto): Promise<Announcement> {
    const announcement = this.repo.create({
      title: dto.title,
      detail: dto.detail,
      icon: dto.icon,
      isActive: dto.isActive ?? true,
      isPinned: dto.isPinned ?? false,
    });
    const saved = await this.repo.save(announcement);
    await this.cache.invalidateNamespace(CacheKeys.announcementPublicNs);
    return saved;
  }

  async update(id: number, dto: UpdateAnnouncementDto): Promise<Announcement> {
    const announcement = await this.findOne(id);
    if (dto.title !== undefined) announcement.title = dto.title;
    if (dto.detail !== undefined) announcement.detail = dto.detail;
    if (dto.icon !== undefined) announcement.icon = dto.icon;
    if (dto.isActive !== undefined) announcement.isActive = dto.isActive;
    if (dto.isPinned !== undefined) announcement.isPinned = dto.isPinned;
    const saved = await this.repo.save(announcement);
    await this.cache.invalidateNamespace(CacheKeys.announcementPublicNs);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const announcement = await this.findOne(id);
    await this.repo.remove(announcement);
    await this.cache.invalidateNamespace(CacheKeys.announcementPublicNs);
  }

  private async findOne(id: number): Promise<Announcement> {
    const announcement = await this.repo.findOne({ where: { id } });
    if (!announcement) throw new NotFoundException(`Announcement ${id} not found`);
    return announcement;
  }
}
