import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseRequestItem } from '../../purchase-requests/entities/purchase-request-item.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'po_id' })
  purchaseOrder!: PurchaseOrder;

  @Column({ name: 'po_id' })
  poId!: number;

  @ManyToOne(() => PurchaseRequestItem, { nullable: true, eager: false })
  @JoinColumn({ name: 'pr_item_id' })
  prItem!: PurchaseRequestItem | null;

  @Column({ name: 'pr_item_id', nullable: true })
  prItemId!: number | null;

  @ApiProperty()
  @Column({ name: 'item_name', length: 255 })
  itemName!: string;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity!: number;

  @ApiProperty()
  @Column({ length: 50 })
  unit!: string;

  @ApiProperty()
  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice!: number;

  @ApiProperty()
  @Column({ name: 'total_price', type: 'decimal', precision: 15, scale: 2 })
  totalPrice!: number;

  @ApiProperty()
  @Column({
    name: 'received_quantity',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  receivedQuantity!: number;
}
