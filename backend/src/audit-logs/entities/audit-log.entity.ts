import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId: number | null;

  @ApiProperty({ example: 'PR_STATUS_CHANGED' })
  @Column({ length: 100 })
  action: string;

  @ApiProperty({ example: 'PurchaseRequest' })
  @Column({ name: 'entity_type', length: 50 })
  entityType: string;

  @ApiProperty()
  @Column({ name: 'entity_id', type: 'integer' })
  entityId: number;

  @ApiProperty({ nullable: true })
  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, any> | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, any> | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
