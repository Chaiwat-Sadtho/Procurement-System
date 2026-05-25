import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBudgetDto {
  @ApiProperty({ example: 1500000 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  totalAmount: number;
}
