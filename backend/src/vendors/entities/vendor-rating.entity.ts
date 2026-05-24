import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Unique } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Vendor } from './vendor.entity';

@Entity('vendor_ratings')
@Unique('UQ_vendor_rating_po', ['poId'])
export class VendorRating {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Vendor, { eager: false })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ name: 'vendor_id' })
  vendorId: number;

  @Column({ name: 'po_id' })
  poId: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Column({ type: 'integer' })
  score: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'rated_by' })
  ratedBy: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
