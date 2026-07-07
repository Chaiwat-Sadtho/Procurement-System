import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GoodsReceiptsService } from './goods-receipts.service';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { GrnQueryDto } from './dto/grn-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Goods Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly grnService: GoodsReceiptsService) {}

  @ApiOperation({ summary: 'บันทึก GRN (PO only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateGoodsReceiptDto) {
    return this.grnService.create(user.id, dto);
  }

  // H3: read = Manager + PO เท่านั้น (mirror FE routing) — เหตุผลเดียวกับ PO controller
  @ApiOperation({ summary: 'ดู GRN list (Manager, PO)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.PROCUREMENT_OFFICER)
  @Get()
  findAll(@Query() query: GrnQueryDto) {
    return this.grnService.findAll(query);
  }

  @ApiOperation({ summary: 'ดู GRN รายละเอียด (Manager, PO)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.PROCUREMENT_OFFICER)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.grnService.findOne(id);
  }
}
