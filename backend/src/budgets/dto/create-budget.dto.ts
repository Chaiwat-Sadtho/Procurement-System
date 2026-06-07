import { IsInt, IsPositive, Min, Max, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ description: 'ID ของ department' })
  @IsInt()
  @IsPositive()
  departmentId: number;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2100)
  @Type(() => Number)
  fiscalYear: number;

  @ApiPropertyOptional({
    example: null,
    description: '1-4 หรือ null สำหรับงบรายปี',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  @Type(() => Number)
  quarter?: number | null;

  @ApiProperty({ example: 1000000 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  totalAmount: number;
}
