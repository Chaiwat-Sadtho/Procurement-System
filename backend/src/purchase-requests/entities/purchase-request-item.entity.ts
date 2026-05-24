import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseRequest } from './purchase-request.entity';

@Entity('purchase_request_items')
export class PurchaseRequestItem {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PurchaseRequest, (pr) => pr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pr_id' })
  purchaseRequest: PurchaseRequest;

  @Column({ name: 'pr_id' })
  prId: number;

  @ApiProperty()
  @Column({ name: 'item_name', length: 255 })
  itemName: string;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @ApiProperty()
  @Column({ length: 50 })
  unit: string;

  @ApiProperty()
  @Column({ name: 'estimated_unit_price', type: 'decimal', precision: 15, scale: 2 })
  estimatedUnitPrice: number;

  @ApiProperty()
  @Column({ name: 'estimated_total_price', type: 'decimal', precision: 15, scale: 2 })
  estimatedTotalPrice: number;
}
