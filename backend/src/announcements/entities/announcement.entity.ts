import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum AnnouncementIcon {
  MEGAPHONE = 'megaphone',
  FILE = 'file',
  CALENDAR = 'calendar',
  PACKAGE = 'package',
  BELL = 'bell',
}

@Entity('announcements')
export class Announcement {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty()
  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 200 })
  detail!: string;

  @ApiProperty({ enum: AnnouncementIcon })
  @Column({ type: 'varchar', length: 20 })
  icon!: AnnouncementIcon;

  @ApiProperty()
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ApiProperty()
  @Column({ name: 'is_pinned', default: false })
  isPinned!: boolean;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
