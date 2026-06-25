import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import type { Server as HttpServer } from 'http';
import { AppModule } from '../src/app.module';
import { AuthResponse, IdResponse } from './types';

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe('Notifications real-time (e2e)', () => {
  let app: INestApplication;
  let url: string;
  let employeeToken: string;
  let managerToken: string;
  let procurementToken: string;
  const sockets: Socket[] = [];

  const connect = (token?: string): Socket => {
    const socket = io(`${url}/notifications`, {
      transports: ['websocket'],
      auth: token ? { token } : {},
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    return socket;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();
    await app.listen(0); // ephemeral port — socket.io-client needs a real listener
    const port = ((app.getHttpServer() as HttpServer).address() as AddressInfo).port;
    url = `http://localhost:${port}`;

    const login = async (email: string) =>
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: 'Password123' })
          .expect(201)
      ).body as AuthResponse;

    employeeToken = (await login('employee@company.com')).access_token;
    managerToken = (await login('manager@company.com')).access_token;
    procurementToken = (await login('procurement@company.com')).access_token;
  });

  afterAll(async () => {
    for (const s of sockets) s.disconnect();
    await app.close();
  });

  it('rejects an unauthenticated handshake (connect_error)', async () => {
    const socket = connect(undefined);
    const err = await waitForEvent<Error>(socket, 'connect_error');
    expect(err.message).toBe('Unauthorized');
  });

  it('rejects an invalid token (connect_error)', async () => {
    const socket = connect('not-a-real-jwt');
    const err = await waitForEvent<Error>(socket, 'connect_error');
    expect(err.message).toBe('Unauthorized');
  });

  it('delivers pr_submitted to the dept manager when an employee submits a PR', async () => {
    const managerSocket = connect(managerToken);
    await waitForEvent(managerSocket, 'connect');

    // employee@ + manager@ are both in dept "Engineering" (seed) → submit notifies the manager.
    const created = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'ขอซื้ออุปกรณ์ realtime test',
        requiredDate: '2026-12-31',
        items: [{ itemName: 'Mouse', quantity: 1, unit: 'unit', estimatedUnitPrice: 500 }],
      })
      .expect(201);
    const prId = (created.body as IdResponse).id;

    const eventPromise = waitForEvent<{ type: string; referenceId: number }>(
      managerSocket,
      'notification:new',
    );
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(201);

    const payload = await eventPromise;
    expect(payload.type).toBe('pr_submitted');
    expect(payload.referenceId).toBe(prId);
  });

  it('does NOT deliver that notification to an unrelated user (isolation)', async () => {
    // procurement@ is in dept Operations and is not a manager → must not receive Engineering pr_submitted.
    const poSocket = connect(procurementToken);
    await waitForEvent(poSocket, 'connect');
    let received = false;
    poSocket.once('notification:new', () => {
      received = true;
    });

    const created = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'ขอซื้อ isolation test',
        requiredDate: '2026-12-31',
        items: [{ itemName: 'Keyboard', quantity: 1, unit: 'unit', estimatedUnitPrice: 800 }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${(created.body as IdResponse).id}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(201);

    await new Promise((r) => setTimeout(r, 1000));
    expect(received).toBe(false);
  });

  it('GET /notifications/unread-count returns a count for the manager', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    const body = res.body as { count: number };
    expect(typeof body.count).toBe('number');
    expect(body.count).toBeGreaterThanOrEqual(1); // at least the pr_submitted above
  });
});
