import {
  IsString, IsNotEmpty, IsOptional, IsEmail,
  MaxLength, IsArray, IsInt, IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty({ example: 'บริษัท ไอทีซัพพลาย จำกัด' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: '0105563123456' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  @ApiPropertyOptional({ example: 'contact@itsupply.co.th' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '02-123-4567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '123 ถนนสุขุมวิท กรุงเทพฯ' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ type: [Number], description: 'ID ของ categories' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  categoryIds?: number[];
}
