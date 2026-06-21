import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AnnouncementsService } from '@app/announcements/announcements.service';
import { Announcement, AnnouncementIcon } from '@app/announcements/entities/announcement.entity';
import { CacheService } from '@app/cache/cache.service';

const mockActive: Partial<Announcement> = {
  id: 1,
  title: 'ปิดปรับปรุงระบบ',
  detail: 'เสาร์นี้ 22:00',
  icon: AnnouncementIcon.MEGAPHONE,
  isActive: true,
  isPinned: false,
};

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockCache = {
  getOrSetNamespaced: jest.fn((_ns: string, _sub: string, _ttl: number, factory: () => unknown) =>
    factory(),
  ),
  invalidateNamespace: jest.fn(),
};

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        { provide: getRepositoryToken(Announcement), useValue: mockRepo },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();
    service = module.get<AnnouncementsService>(AnnouncementsService);
    jest.clearAllMocks();
  });

  describe('findActive', () => {
    it('returns active only, pinned-first then newest, mapped to public shape, cached', async () => {
      mockRepo.find.mockResolvedValue([{ ...mockActive, isPinned: true }]);
      const result = await service.findActive();

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { isPinned: 'DESC', createdAt: 'DESC' },
      });
      expect(result).toEqual([
        {
          id: 1,
          title: 'ปิดปรับปรุงระบบ',
          detail: 'เสาร์นี้ 22:00',
          icon: 'megaphone',
          isPinned: true,
        },
      ]);
      expect(mockCache.getOrSetNamespaced).toHaveBeenCalledWith(
        'announcement:public',
        'active',
        60,
        expect.any(Function),
      );
    });
  });

  describe('findAll', () => {
    it('returns all (incl inactive) ordered pinned-first then newest, NOT cached', async () => {
      mockRepo.find.mockResolvedValue([mockActive]);
      await service.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({
        order: { isPinned: 'DESC', createdAt: 'DESC' },
      });
      expect(mockCache.getOrSetNamespaced).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('saves with defaults (active true / pinned false) and invalidates public cache', async () => {
      mockRepo.create.mockImplementation((v: Partial<Announcement>) => v);
      mockRepo.save.mockResolvedValue({ ...mockActive });
      await service.create({ title: 'A', detail: 'B', icon: AnnouncementIcon.FILE });

      expect(mockRepo.create).toHaveBeenCalledWith({
        title: 'A',
        detail: 'B',
        icon: AnnouncementIcon.FILE,
        isActive: true,
        isPinned: false,
      });
      expect(mockCache.invalidateNamespace).toHaveBeenCalledWith('announcement:public');
    });
  });

  describe('update', () => {
    it('throws NotFound when missing', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update(999, { isActive: false })).rejects.toThrow(NotFoundException);
    });

    it('applies partial change and invalidates public cache', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockActive });
      mockRepo.save.mockImplementation((v: Announcement) => Promise.resolve(v));
      const result = await service.update(1, { isActive: false });
      expect(result.isActive).toBe(false);
      expect(mockCache.invalidateNamespace).toHaveBeenCalledWith('announcement:public');
    });
  });

  describe('remove', () => {
    it('throws NotFound when missing', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('removes and invalidates public cache', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockActive });
      mockRepo.remove.mockResolvedValue({ ...mockActive });
      await service.remove(1);
      expect(mockRepo.remove).toHaveBeenCalled();
      expect(mockCache.invalidateNamespace).toHaveBeenCalledWith('announcement:public');
    });
  });
});
