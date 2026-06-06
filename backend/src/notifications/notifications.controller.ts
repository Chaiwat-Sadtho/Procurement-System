import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'ดู notification ของตัวเอง' })
  @Get()
  findAll(@CurrentUser() user: { id: number }, @Query() query: NotificationQueryDto) {
    return this.notificationsService.findAll(user.id, query);
  }

  @ApiOperation({ summary: 'Mark notification ทั้งหมดว่าอ่านแล้ว' })
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() user: { id: number }) {
    return this.notificationsService.markAllRead(user.id);
  }

  @ApiOperation({ summary: 'Mark notification ว่าอ่านแล้ว' })
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    return this.notificationsService.markRead(id, user.id);
  }
}
