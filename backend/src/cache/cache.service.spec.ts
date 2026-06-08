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

  describe('namespaced', () => {
    it('getOrSetNamespaced uses generation 1 when no counter exists', async () => {
      store.get
        .mockResolvedValueOnce(undefined) // generation lookup
        .mockResolvedValueOnce(undefined); // value lookup
      const factory = jest.fn().mockResolvedValue(['a']);
      const result = await service.getOrSetNamespaced('vendor:list', 'h1', 60, factory);
      expect(result).toEqual(['a']);
      expect(store.set).toHaveBeenCalledWith('vendor:list:g1:h1', ['a'], 60_000);
    });

    it('invalidateNamespace bumps the generation counter', async () => {
      store.get.mockResolvedValue(2); // current gen
      await service.invalidateNamespace('vendor:list');
      expect(store.set).toHaveBeenCalledWith('vendor:list:gen', 3, 0);
    });

    it('after invalidate, namespaced key uses new generation', async () => {
      store.get
        .mockResolvedValueOnce(3) // generation lookup
        .mockResolvedValueOnce(undefined); // value miss
      const factory = jest.fn().mockResolvedValue(['b']);
      await service.getOrSetNamespaced('vendor:list', 'h1', 60, factory);
      expect(store.set).toHaveBeenCalledWith('vendor:list:g3:h1', ['b'], 60_000);
    });
  });
});
