import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  // PUBLIC — shown on the login page before authentication. NO guard.
  @ApiOperation({ summary: 'ดูประกาศที่เปิดใช้งาน (public - แสดงหน้า login)' })
  @Get('active')
  findActive() {
    return this.service.findActive();
  }

  @ApiOperation({ summary: 'ดูประกาศทั้งหมดสำหรับจัดการ (PO only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'เพิ่มประกาศ (PO only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post()
  create(@Body() dto: CreateAnnouncementDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'แก้ไข/สลับสถานะประกาศ (PO only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAnnouncementDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'ลบประกาศ (PO only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
