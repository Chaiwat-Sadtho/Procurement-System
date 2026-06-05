import { IsOptional, IsEnum, IsDateString, IsString, IsInt, IsBoolean, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrStatus } from '../entities/purchase-request.entity';

export class PrQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: PrStatus })
  @IsOptional()
  @IsEnum(PrStatus)
  status?: PrStatus;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'PR-2026-0001' })
  @IsOptional()
  @IsString()
  prNumber?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  requesterId?: number;

  @ApiPropertyOptional({ example: 'สมชาย' })
  @IsOptional()
  @IsString()
  requesterName?: string;

  @ApiPropertyOptional({ default: 'created_at', enum: ['created_at', 'title', 'total_estimated_amount'] })
  @IsOptional()
  @IsString()
  sort?: string = 'created_at';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';

  // First boolean query flag in this DTO. Query strings arrive as 'true'/'false',
  // so @IsBoolean alone would reject the string — @Transform coerces it first.
  // โดยตั้งใจ: เฉพาะ 'true' (หรือ boolean true) → true; ค่าอื่นทุกค่า (รวม 'banana'/'1'/absent) → false
  // (ไม่มี 400) เพราะ branch เดียวที่มีผลคือ truthy = "กรอง"; ค่าอื่น = "ไม่กรอง" = พฤติกรรมเดิม
  @ApiPropertyOptional({ description: 'เฉพาะ PR ที่พร้อมแปลงเป็น PO (approved + มีแผนก + ยังไม่มี PO active)' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  eligibleForPo?: boolean;
}
