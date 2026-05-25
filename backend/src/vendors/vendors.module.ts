import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { VendorCategory } from './entities/vendor-category.entity';
import { VendorRating } from './entities/vendor-rating.entity';
import { VendorsService } from './vendors.service';
import { VendorCategoriesService } from './vendor-categories.service';
import { VendorsController } from './vendors.controller';
import { VendorCategoriesController } from './vendor-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, VendorCategory, VendorRating])],
  controllers: [VendorsController, VendorCategoriesController],
  providers: [VendorsService, VendorCategoriesService],
  exports: [VendorsService, VendorCategoriesService],
})
export class VendorsModule {}
