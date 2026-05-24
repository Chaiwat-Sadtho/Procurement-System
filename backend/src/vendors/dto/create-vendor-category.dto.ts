import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVendorCategoryDto {
  @ApiProperty({ example: 'IT Equipment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
