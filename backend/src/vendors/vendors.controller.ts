import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { BlacklistVendorDto } from './dto/blacklist-vendor.dto';
import { VendorQueryDto } from './dto/vendor-query.dto';
import { VendorRatingQueryDto } from './dto/vendor-rating-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @ApiOperation({ summary: 'เพิ่ม vendor ใหม่ (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post()
  create(@Body() dto: CreateVendorDto) {
    return this.vendorsService.create(dto);
  }

  @ApiOperation({ summary: 'ดู vendor list (PO, Manager)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER, UserRole.MANAGER)
  @Get()
  findAll(@Query() query: VendorQueryDto) {
    return this.vendorsService.findAll(query);
  }

  @ApiOperation({ summary: 'ดู vendor รายละเอียด + categories (PO, Manager)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER, UserRole.MANAGER)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.findOne(id);
  }

  @ApiOperation({ summary: 'ดูประวัติคะแนน vendor (PO, Manager)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER, UserRole.MANAGER)
  @Get(':id/ratings')
  findRatings(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: VendorRatingQueryDto,
  ) {
    return this.vendorsService.findRatings(id, query);
  }

  @ApiOperation({ summary: 'แก้ไขข้อมูล vendor (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  @ApiOperation({ summary: 'blacklist vendor (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post(':id/blacklist')
  blacklist(@Param('id', ParseIntPipe) id: number, @Body() dto: BlacklistVendorDto) {
    return this.vendorsService.blacklist(id, dto);
  }

  @ApiOperation({ summary: 'ยกเลิก blacklist vendor (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @HttpCode(HttpStatus.OK)
  @Delete(':id/blacklist')
  unblacklist(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.unblacklist(id);
  }
}
