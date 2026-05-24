import { IsOptional, IsString, IsBoolean, IsInt, IsPositive, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class VendorQueryDto {
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

  @ApiPropertyOptional({ example: 'ไอที' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isBlacklisted?: boolean;

  @ApiPropertyOptional({ description: 'filter by category ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  categoryId?: number;
}
