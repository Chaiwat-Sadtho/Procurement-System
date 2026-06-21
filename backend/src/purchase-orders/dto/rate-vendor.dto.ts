import { IsInt, Min, Max, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RateVendorDto {
  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  score!: number;

  @ApiPropertyOptional({ example: 'ส่งของตรงเวลา คุณภาพดี' })
  @IsOptional()
  @IsString()
  comment?: string;
}
