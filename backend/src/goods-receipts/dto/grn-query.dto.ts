import { IsOptional, IsInt, IsPositive, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GrnStatus } from '../entities/goods-receipt-note.entity';

export class GrnQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  poId?: number;

  @ApiPropertyOptional({ enum: GrnStatus })
  @IsOptional()
  @IsEnum(GrnStatus)
  status?: GrnStatus;
}
