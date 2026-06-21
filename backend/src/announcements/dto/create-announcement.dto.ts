import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementIcon } from '../entities/announcement.entity';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'ปิดปรับปรุงระบบ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @ApiProperty({ example: 'เสาร์ที่ 30 พ.ค. 22:00-24:00 น.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  detail!: string;

  @ApiProperty({ enum: AnnouncementIcon })
  @IsEnum(AnnouncementIcon)
  icon!: AnnouncementIcon;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
