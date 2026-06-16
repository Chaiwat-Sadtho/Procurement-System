import {
  IsInt,
  IsPositive,
  IsDateString,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateGrnItemDto } from './create-grn-item.dto';

export class CreateGoodsReceiptDto {
  @ApiProperty({ description: 'ID ของ PO' })
  @IsInt()
  @IsPositive()
  poId!: number;

  @ApiProperty({ example: '2025-11-15' })
  @IsDateString()
  receivedDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateGrnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGrnItemDto)
  items!: CreateGrnItemDto[];
}
