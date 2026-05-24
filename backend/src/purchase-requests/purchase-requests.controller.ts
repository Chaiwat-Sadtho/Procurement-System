import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchaseRequestsService } from './purchase-requests.service';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { RejectPurchaseRequestDto } from './dto/reject-purchase-request.dto';
import { PrQueryDto } from './dto/pr-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Purchase Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly service: PurchaseRequestsService) {}

  @ApiOperation({ summary: 'สร้าง PR ใหม่ (Employee only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMPLOYEE)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePurchaseRequestDto) {
    return this.service.create(user.id, dto);
  }

  @ApiOperation({ summary: 'ดู PR list — กรองตาม role อัตโนมัติ (All)' })
  @Get()
  findAll(@CurrentUser() user: any, @Query() query: PrQueryDto) {
    return this.service.findAll(user, query);
  }

  @ApiOperation({ summary: 'ดู PR รายละเอียด (All)' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @ApiOperation({ summary: 'แก้ไข PR (Employee, draft only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMPLOYEE)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdatePurchaseRequestDto,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @ApiOperation({ summary: 'ลบ PR (Employee, draft only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.remove(id, user.id);
  }

  @ApiOperation({ summary: 'ส่งขออนุมัติ PR (Employee)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMPLOYEE)
  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.submit(id, user.id);
  }

  @ApiOperation({ summary: 'อนุมัติ PR (Manager)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.approve(id, user.id);
  }

  @ApiOperation({ summary: 'ปฏิเสธ PR พร้อมเหตุผล (Manager)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: RejectPurchaseRequestDto,
  ) {
    return this.service.reject(id, user.id, dto);
  }
}
