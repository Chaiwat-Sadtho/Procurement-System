import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseRequestItemDto {
  @ApiProperty({ example: 'MacBook Pro 14"' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName: string;

  @ApiPropertyOptional({ example: 'สำหรับทีม Engineering' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 'unit' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit: string;

  @ApiProperty({ example: 69900 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedUnitPrice: number;
}
