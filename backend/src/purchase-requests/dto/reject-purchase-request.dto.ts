import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPurchaseRequestDto {
  @ApiProperty({ example: 'งบประมาณไม่เพียงพอ' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
