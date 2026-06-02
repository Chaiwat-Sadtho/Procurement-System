import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { PurchaseRequestItem } from './purchase-request-item.entity';

export enum PrStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('purchase_requests')
export class PurchaseRequest {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'PR-2025-0001' })
  @Column({ name: 'pr_number', unique: true, length: 20 })
  prNumber: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ name: 'requester_id' })
  requesterId: number;

  @ManyToOne(() => Department, { eager: false, nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @Column({ name: 'department_id', nullable: true })
  departmentId: number | null;

  @ApiProperty()
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ enum: PrStatus })
  @Column({ type: 'enum', enum: PrStatus, default: PrStatus.DRAFT })
  status: PrStatus;

  @ApiProperty()
  @Column({ name: 'required_date', type: 'date' })
  requiredDate: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'quarter', type: 'integer', nullable: true })
  quarter: number | null;

  @ApiProperty()
  @Column({
    name: 'total_estimated_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalEstimatedAmount: number;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: User | null;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: number | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'fiscal_year', type: 'integer', nullable: true })
  fiscalYear: number | null;

  @ApiProperty()
  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string | null;

  @OneToMany(() => PurchaseRequestItem, (item) => item.purchaseRequest, {
    cascade: true,
  })
  items: PurchaseRequestItem[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
