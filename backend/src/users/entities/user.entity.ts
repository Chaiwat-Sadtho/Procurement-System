import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Department } from '../../departments/entities/department.entity';

export enum UserRole {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  PROCUREMENT_OFFICER = 'procurement_officer',
}

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Department, { nullable: true, eager: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'department_id', nullable: true })
  departmentId: number;

  @ApiProperty()
  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @ApiProperty()
  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @ApiPropertyOptional()
  @Column({ name: 'middle_name', type: 'varchar', nullable: true })
  middleName: string | null;

  @ApiProperty()
  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @ApiProperty({ enum: UserRole })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @ApiProperty()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiProperty({ example: 'John Michael Doe' })
  @Expose()
  get fullName(): string {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }
}
