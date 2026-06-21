import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementIcon } from '../entities/announcement.entity';

export class UpdateAnnouncementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  detail?: string;

  @ApiPropertyOptional({ enum: AnnouncementIcon })
  @IsOptional()
  @IsEnum(AnnouncementIcon)
  icon?: AnnouncementIcon;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
