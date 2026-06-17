import { hostname } from 'node:os';
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @ApiOperation({ summary: 'Liveness check — public, ไม่ต้อง auth' })
  @Get()
  check(): { status: string; timestamp: string; instance: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      instance: process.env.INSTANCE_ID ?? hostname(),
    };
  }
}
