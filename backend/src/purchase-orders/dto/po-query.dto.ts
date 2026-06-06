import { IsOptional, IsEnum, IsInt, IsPositive, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PoStatus } from '../entities/purchase-order.entity';

export class PoQueryDto {
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

  @ApiPropertyOptional({ enum: PoStatus })
  @IsOptional()
  @IsEnum(PoStatus)
  status?: PoStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  vendorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  prId?: number;

  // Query strings arrive as 'true'/'false', so @IsBoolean alone would reject the string —
  // @Transform coerces it first. เฉพาะ 'true' (หรือ boolean true) → true; ค่าอื่น → false (ไม่กรอง, ไม่มี 400).
  @ApiPropertyOptional({
    description: 'เฉพาะ PO ที่รับของได้ (acknowledged + partially_received)',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  receivable?: boolean;
}
