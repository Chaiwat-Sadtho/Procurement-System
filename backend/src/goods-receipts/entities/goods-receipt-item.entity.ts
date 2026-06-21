import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { GoodsReceiptNote } from './goods-receipt-note.entity';
import { PurchaseOrderItem } from '../../purchase-orders/entities/purchase-order-item.entity';

export enum ItemCondition {
  GOOD = 'good',
  DAMAGED = 'damaged',
}

@Entity('goods_receipt_items')
export class GoodsReceiptItem {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => GoodsReceiptNote, (grn) => grn.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'grn_id' })
  goodsReceiptNote!: GoodsReceiptNote;

  @Column({ name: 'grn_id' })
  grnId!: number;

  @ManyToOne(() => PurchaseOrderItem, { eager: false })
  @JoinColumn({ name: 'po_item_id' })
  poItem!: PurchaseOrderItem;

  @Column({ name: 'po_item_id' })
  poItemId!: number;

  @ApiProperty()
  @Column({
    name: 'received_quantity',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  receivedQuantity!: number;

  @ApiProperty({ enum: ItemCondition })
  @Column({ type: 'enum', enum: ItemCondition })
  condition!: ItemCondition;
}
