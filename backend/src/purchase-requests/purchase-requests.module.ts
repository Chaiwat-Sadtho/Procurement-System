import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseRequest } from './entities/purchase-request.entity';
import { PurchaseRequestItem } from './entities/purchase-request-item.entity';
import { User } from '../users/entities/user.entity';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PurchaseRequestsController } from './purchase-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseRequest, PurchaseRequestItem, User])],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
  exports: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}
