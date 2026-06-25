import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller';
import { applyCors } from '../src/common/cors';

// Exercises the REAL bootstrap CORS wiring (applyCors, also called by main.ts):
// applyCors -> resolveCorsOrigin(config) -> app.enableCors. A controlled
// ConfigService keeps the allowlist deterministic without mutating process.env
// (which leaks across e2e suites via @nestjs/config). Boots only HealthController
// so the assertion targets the HTTP/CORS layer and needs no database.
const ALLOWED = 'http://allowed.test';
const DISALLOWED = 'http://evil.test';

const fakeConfig = {
  get: (key: string): string => (key === 'CORS_ORIGIN' ? ALLOWED : 'production'),
} as unknown as ConfigService;

describe('CORS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: ConfigService, useValue: fakeConfig }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    applyCors(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reflects an allowed origin in Access-Control-Allow-Origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', ALLOWED)
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  it('does not allow an origin outside the allowlist', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', DISALLOWED)
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
