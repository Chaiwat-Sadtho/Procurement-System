import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique, Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Department } from '../../departments/entities/department.entity';

@Entity('budgets')
@Unique(['departmentId', 'fiscalYear', 'quarter'])
// Review #2: composite UNIQUE above lets duplicate annual rows through (Postgres treats
// NULL quarters as distinct). This partial index enforces one annual budget per dept/year.
@Index('UQ_annual_budget_per_dept_year', ['departmentId', 'fiscalYear'], {
  unique: true,
  where: '"quarter" IS NULL',
})
export class Budget {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Department, { eager: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'department_id' })
  departmentId: number;

  @ApiProperty({ example: 2026 })
  @Column({ name: 'fiscal_year' })
  fiscalYear: number;

  @ApiProperty({ nullable: true, description: '1-4 หรือ null สำหรับงบรายปี' })
  @Column({ type: 'integer', nullable: true, default: null })
  quarter: number | null;

  @ApiProperty({ example: 1000000 })
  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @ApiProperty({ example: 0 })
  @Column({ name: 'reserved_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  reservedAmount: number;

  @ApiProperty({ example: 0 })
  @Column({ name: 'used_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  usedAmount: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
