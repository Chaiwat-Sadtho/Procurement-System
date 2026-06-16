import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('vendor_categories')
export class VendorCategory {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 'IT Equipment' })
  @Column({ length: 100, unique: true })
  name!: string;
}
