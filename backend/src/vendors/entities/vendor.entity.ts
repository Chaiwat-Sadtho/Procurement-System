import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { VendorCategory } from './vendor-category.entity';

@Entity('vendors')
export class Vendor {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 'บริษัท ไอทีซัพพลาย จำกัด' })
  @Column({ length: 255 })
  name!: string;

  @ApiProperty({ example: '0105563123456', nullable: true })
  @Column({
    name: 'tax_id',
    type: 'varchar',
    length: 20,
    nullable: true,
    unique: true,
  })
  taxId!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', nullable: true, length: 255 })
  email!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', nullable: true, length: 20 })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @ApiProperty()
  @Column({ name: 'is_blacklisted', default: false })
  isBlacklisted!: boolean;

  @ApiProperty({ nullable: true })
  @Column({ name: 'blacklist_reason', type: 'text', nullable: true })
  blacklistReason!: string | null;

  @ApiProperty({ nullable: true })
  @Column({
    name: 'rating_avg',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
  })
  ratingAvg!: number | null;

  @ApiProperty({ type: () => [VendorCategory] })
  @ManyToMany(() => VendorCategory, { eager: false })
  @JoinTable({
    name: 'vendor_category_mappings',
    joinColumn: { name: 'vendor_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories!: VendorCategory[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
