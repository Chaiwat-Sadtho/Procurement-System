import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  PR_SUBMITTED = 'pr_submitted',
  PR_APPROVED = 'pr_approved',
  PR_REJECTED = 'pr_rejected',
  PO_CREATED = 'po_created',
  PO_ACKNOWLEDGED = 'po_acknowledged',
  GRN_CREATED = 'grn_created',
  BUDGET_WARNING = 'budget_warning',
}

@Entity('notifications')
export class Notification {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ApiProperty()
  @Column({ length: 255 })
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({ enum: NotificationType })
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ default: false })
  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @ApiProperty({ nullable: true })
  @Column({ name: 'reference_id', type: 'integer', nullable: true })
  referenceId: number | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
