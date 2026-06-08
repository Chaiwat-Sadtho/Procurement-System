import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { VendorCategory } from '../src/vendors/entities/vendor-category.entity';
import { CacheService } from '../src/cache/cache.service';
import { CacheKeys } from '../src/cache/cache-keys';
import { AuthResponse, VendorCategoryResponse } from './types';

// End-to-end proof that the Redis cache layer is wired through the real HTTP +
// DI + Redis stack. Unlike the service unit tests (which mock CacheService), this
// suite REQUIRES a live Redis (docker compose up -d redis / CI redis service):
//   - cache HIT  → the second identical read does NOT touch the DB (repo.find
//     not re-invoked). With Redis down, CacheService degrades to the factory on
//     every call, so the second read WOULD hit the DB and this test fails — which
//     is exactly the guarantee we want CI to enforce.
//   - invalidate → create() calls cache.del, so the next read re-queries the DB
//     and returns the freshly-created row instead of a stale cached list.
//
// vendor-categories is chosen because it is a plain {id, name} reference entity
// cached under a single key (CacheTtl.REFERENCE) — no relations or @Expose getters,
// so the JSON round-trip through Redis is lossless.

describe('Cache (e2e)', () => {
  let app: INestApplication;
  let procurementToken: string;
  let categoryRepo: Repository<VendorCategory>;
  let cache: CacheService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    categoryRepo = app.get<Repository<VendorCategory>>(getRepositoryToken(VendorCategory));
    cache = app.get(CacheService);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'procurement@company.com', password: 'Password123' })
      .expect(201);
    procurementToken = (res.body as AuthResponse).access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the second identical GET from cache without re-querying the DB', async () => {
    // Start from a cold key so the first read is guaranteed to be a miss.
    await cache.del(CacheKeys.vendorCategories);
    const findSpy = jest.spyOn(categoryRepo, 'find');

    await request(app.getHttpServer())
      .get('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);
    expect(findSpy).toHaveBeenCalledTimes(1); // miss → factory ran

    await request(app.getHttpServer())
      .get('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);
    expect(findSpy).toHaveBeenCalledTimes(1); // hit → factory NOT re-run (DB untouched)

    findSpy.mockRestore();
  });

  it('invalidates the cache on create so the new category is visible immediately', async () => {
    const name = `Cache E2E Cat ${Date.now()}`;

    // Warm the cache with the pre-create list.
    await request(app.getHttpServer())
      .get('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    // create() calls cache.del — without it the next GET would return the stale list.
    await request(app.getHttpServer())
      .post('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ name })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    const categories = res.body as VendorCategoryResponse[];
    expect(categories.some((c) => c.name === name)).toBe(true);
  });
});
