import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VendorCategoriesService } from './vendor-categories.service';
import { CreateVendorCategoryDto } from './dto/create-vendor-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Vendor Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vendor-categories')
export class VendorCategoriesController {
  constructor(private readonly categoriesService: VendorCategoriesService) {}

  @ApiOperation({ summary: 'สร้างหมวดหมู่ vendor ใหม่ (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post()
  create(@Body() dto: CreateVendorCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @ApiOperation({ summary: 'ดูหมวดหมู่ทั้งหมด (All authenticated)' })
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }
}
