import { IsInt, IsPositive, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ItemCondition } from '../entities/goods-receipt-item.entity';

export class CreateGrnItemDto {
  @ApiProperty({ description: 'ID ของ PO item' })
  @IsInt()
  @IsPositive()
  poItemId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  receivedQuantity!: number;

  @ApiProperty({ enum: ItemCondition })
  @IsEnum(ItemCondition)
  condition!: ItemCondition;
}
