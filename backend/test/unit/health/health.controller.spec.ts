import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '@app/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const originalInstanceId = process.env.INSTANCE_ID;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    if (originalInstanceId === undefined) delete process.env.INSTANCE_ID;
    else process.env.INSTANCE_ID = originalInstanceId;
  });

  it('คืน status ok พร้อม timestamp เป็น ISO string', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('คืน instance จาก INSTANCE_ID เมื่อตั้ง env', () => {
    process.env.INSTANCE_ID = 'backend-test-1';

    expect(controller.check().instance).toBe('backend-test-1');
  });

  it('fallback instance เป็น hostname เมื่อไม่ตั้ง INSTANCE_ID', () => {
    delete process.env.INSTANCE_ID;
    const result = controller.check();

    expect(typeof result.instance).toBe('string');
    expect(result.instance.length).toBeGreaterThan(0);
  });
});
