import {
  IsString, IsNotEmpty, IsOptional, IsEmail,
  MaxLength, IsArray, IsInt, IsPositive,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVendorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  categoryIds?: number[];
}
