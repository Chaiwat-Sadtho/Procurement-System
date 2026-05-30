import { Controller, Get, Patch, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'ดู user (PO เห็นทั้งหมด, Manager เห็นเฉพาะแผนกตัวเอง)' })
  @Roles(UserRole.MANAGER, UserRole.PROCUREMENT_OFFICER)
  @Get()
  findAll(@CurrentUser() actor: CurrentUserPayload) {
    return this.usersService.findAll({ role: actor.role, departmentId: actor.departmentId });
  }

  @ApiOperation({ summary: 'เปลี่ยน role (PO only)' })
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Patch(':id/role')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.usersService.updateRole(id, dto, actor.id);
  }

  @ApiOperation({ summary: 'activate/deactivate user (PO only)' })
  @Roles(UserRole.PROCUREMENT_OFFICER)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.usersService.updateStatus(id, dto, actor.id);
  }
}
