import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let store: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    store = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [CacheService, { provide: CACHE_MANAGER, useValue: store }],
    }).compile();
    service = moduleRef.get(CacheService);
  });

  describe('getOrSet', () => {
    it('returns cached value on hit without calling factory', async () => {
      store.get.mockResolvedValue('cached');
      const factory = jest.fn();
      const result = await service.getOrSet('k', 60, factory);
      expect(result).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });

    it('calls factory and sets cache on miss', async () => {
      store.get.mockResolvedValue(undefined);
      const factory = jest.fn().mockResolvedValue('fresh');
      const result = await service.getOrSet('k', 60, factory);
      expect(result).toBe('fresh');
      expect(store.set).toHaveBeenCalledWith('k', 'fresh', 60_000);
    });

    it('falls back to factory when store.get throws (redis down)', async () => {
      store.get.mockRejectedValue(new Error('ECONNREFUSED'));
      const factory = jest.fn().mockResolvedValue('fresh');
      const result = await service.getOrSet('k', 60, factory);
      expect(result).toBe('fresh');
    });
  });

  describe('del', () => {
    it('does not throw when store.del fails', async () => {
      store.del.mockRejectedValue(new Error('down'));
      await expect(service.del('k')).resolves.toBeUndefined();
    });
  });
});
