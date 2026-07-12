import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { CreatePurchaseRequestItemDto } from './create-purchase-request-item.dto';

export class CreatePurchaseRequestDto {
  @ApiProperty({ example: 'ขอซื้ออุปกรณ์คอมพิวเตอร์' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: '2025-12-31' })
  @IsDateString()
  requiredDate!: string;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    maximum: 4,
    description: 'null/เว้นว่าง = งบรายปี, 1-4 = ไตรมาสนั้น',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  quarter?: number;

  @ApiProperty({ type: [CreatePurchaseRequestItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRequestItemDto)
  items!: CreatePurchaseRequestItemDto[];
}
