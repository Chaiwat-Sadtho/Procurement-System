import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { RateVendorDto } from './dto/rate-vendor.dto';
import { PoQueryDto } from './dto/po-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GoodsReceiptsService } from '../goods-receipts/goods-receipts.service';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(
    private readonly poService: PurchaseOrdersService,
    private readonly grnService: GoodsReceiptsService,
  ) {}

  @ApiOperation({ summary: 'สร้าง PO จาก approved PR (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePurchaseOrderDto) {
    return this.poService.create(user.id, dto);
  }

  // H3: read = Manager + PO เท่านั้น (mirror FE routing) — เปิด All จะให้ employee
  // อ่านข้อมูล PR ของคนอื่น (ที่ PR module ห้าม) ผ่าน relation ใน PO ได้
  @ApiOperation({ summary: 'ดู PO list (Manager, PO)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.PROCUREMENT_OFFICER)
  @Get()
  findAll(@Query() query: PoQueryDto) {
    return this.poService.findAll(query);
  }

  @ApiOperation({ summary: 'ดู PO รายละเอียด (Manager, PO)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.PROCUREMENT_OFFICER)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.poService.findOne(id);
  }

  @ApiOperation({ summary: 'แก้ไข PO (PO only, draft only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePurchaseOrderDto) {
    return this.poService.update(id, dto);
  }

  @ApiOperation({ summary: 'ส่ง PO ให้ vendor (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post(':id/send')
  send(@Param('id', ParseIntPipe) id: number) {
    return this.poService.send(id);
  }

  @ApiOperation({ summary: 'vendor รับทราบ PO (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post(':id/acknowledge')
  acknowledge(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.poService.acknowledge(id, user.id);
  }

  @ApiOperation({ summary: 'ยกเลิก PO (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.poService.cancel(id, user.id);
  }

  @ApiOperation({ summary: 'ให้คะแนน vendor หลัง PO completed (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post(':id/ratings')
  rateVendor(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RateVendorDto,
  ) {
    return this.poService.rateVendor(id, user.id, dto);
  }

  @ApiOperation({ summary: 'ดูคะแนนของ PO (null ถ้ายังไม่ให้คะแนน)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.PROCUREMENT_OFFICER)
  @Get(':id/rating')
  getRating(@Param('id', ParseIntPipe) id: number) {
    return this.poService.findRatingForPo(id);
  }

  @ApiOperation({ summary: 'ดู GRN ทั้งหมดของ PO (Manager, PO)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.PROCUREMENT_OFFICER)
  @Get(':id/goods-receipts')
  findGrnsByPo(@Param('id', ParseIntPipe) id: number) {
    return this.grnService.findByPo(id);
  }
}
