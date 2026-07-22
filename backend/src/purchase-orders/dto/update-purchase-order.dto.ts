import {
  IsDateString,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  // null clears the notes; omitting the field leaves them untouched
  @ApiPropertyOptional({ nullable: true, description: 'ส่ง null เพื่อเคลียร์ notes เดิม' })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ type: [CreatePurchaseOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items?: CreatePurchaseOrderItemDto[];
}
