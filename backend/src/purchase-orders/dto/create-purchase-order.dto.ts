import { IsInt, IsPositive, IsDateString, IsOptional, IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'ID ของ approved PR' })
  @IsInt()
  @IsPositive()
  prId: number;

  @ApiProperty({ description: 'ID ของ vendor (ต้องไม่ blacklisted)' })
  @IsInt()
  @IsPositive()
  vendorId: number;

  @ApiProperty({ example: '2025-12-31' })
  @IsDateString()
  expectedDeliveryDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}
