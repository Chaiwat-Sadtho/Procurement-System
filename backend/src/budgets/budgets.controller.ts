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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetQueryDto } from './dto/budget-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @ApiOperation({ summary: 'กำหนดงบประมาณ (PO เท่านั้น)' })
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Post()
  create(@Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(dto);
  }

  @ApiOperation({ summary: 'ดูงบประมาณทุก department (Manager, PO)' })
  @Roles(UserRole.MANAGER, UserRole.PROCUREMENT_OFFICER)
  @Get()
  findAll(@Query() query: BudgetQueryDto) {
    return this.budgetsService.findAll(query);
  }

  @ApiOperation({ summary: 'ดูงบของ department ที่ระบุ' })
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.PROCUREMENT_OFFICER)
  @Get('department/:id')
  findByDepartment(@Param('id', ParseIntPipe) id: number) {
    return this.budgetsService.findByDepartment(id);
  }

  @ApiOperation({ summary: 'สรุปงบ: reserved/used/remaining (Manager, PO)' })
  @Roles(UserRole.MANAGER, UserRole.PROCUREMENT_OFFICER)
  @Get(':id/summary')
  getSummary(@Param('id', ParseIntPipe) id: number) {
    return this.budgetsService.getSummary(id);
  }

  @ApiOperation({ summary: 'ปรับจำนวนงบ (PO เท่านั้น)' })
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBudgetDto) {
    return this.budgetsService.update(id, dto);
  }
}
