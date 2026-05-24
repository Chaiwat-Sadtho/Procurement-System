import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlacklistVendorDto {
  @ApiProperty({ example: 'ส่งสินค้าไม่ตรงสเปค 3 ครั้งติดต่อกัน' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
