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

  // Query strings arrive as 'true'/'false', so @Transform coerces before @IsBoolean. Only 'true' filters;
  // anything else means "no filter" rather than a 400.
  @ApiPropertyOptional({
    description: 'เฉพาะ PO ที่รับของได้ (acknowledged + partially_received)',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  receivable?: boolean;

  // History twin of `receivable`: POs that already have a GRN, used by the GRN list filter
  @ApiPropertyOptional({
    description: 'เฉพาะ PO ที่มีการรับของแล้ว (partially_received + completed)',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  withReceipts?: boolean;
}
