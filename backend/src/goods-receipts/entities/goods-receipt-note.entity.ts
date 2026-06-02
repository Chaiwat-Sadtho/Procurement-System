import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrder } from '../../purchase-orders/entities/purchase-order.entity';
import { User } from '../../users/entities/user.entity';
import { GoodsReceiptItem } from './goods-receipt-item.entity';

export enum GrnStatus {
  PARTIAL = 'partial',
  COMPLETE = 'complete',
}

@Entity('goods_receipt_notes')
export class GoodsReceiptNote {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'GRN-2025-0001' })
  @Column({ name: 'grn_number', unique: true, length: 20 })
  grnNumber: string;

  @ManyToOne(() => PurchaseOrder, { eager: false })
  @JoinColumn({ name: 'po_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'po_id' })
  poId: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'received_by' })
  receivedByUser: User;

  @Column({ name: 'received_by' })
  receivedBy: number;

  @ApiProperty()
  @Column({ name: 'received_date', type: 'date' })
  receivedDate: string;

  @ApiProperty({ enum: GrnStatus })
  @Column({ type: 'enum', enum: GrnStatus })
  status: GrnStatus;

  @ApiProperty({ nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => GoodsReceiptItem, (item) => item.goodsReceiptNote, { cascade: true })
  items: GoodsReceiptItem[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
