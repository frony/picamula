import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Trip } from './trip.entity';

export enum MediaFileType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('media_files')
export class MediaFile {
  @PrimaryGeneratedColumn()
  id: number;

  // S3 key (e.g., "trips/123/images/photo.jpg")
  @Column()
  key: string;

  // Full S3 URL (can be regenerated from key, but stored for convenience)
  @Column()
  url: string;

  @Column({
    type: 'enum',
    enum: MediaFileType,
    default: MediaFileType.IMAGE,
  })
  type: MediaFileType;

  // Original filename when uploaded
  @Column({ nullable: true })
  originalName?: string;

  // MIME type (e.g., "image/jpeg", "video/mp4")
  @Column({ nullable: true })
  mimeType?: string;

  // File size in bytes
  @Column({ type: 'bigint', nullable: true })
  size?: number;

  // Order/position for displaying media in a sequence
  @Column({ type: 'int', default: 0 })
  order: number;

  // Optional: Add dimensions for images
  @Column({ type: 'int', nullable: true })
  width?: number;

  @Column({ type: 'int', nullable: true })
  height?: number;

  // Optional: Add duration for videos (in seconds)
  @Column({ type: 'int', nullable: true })
  duration?: number;

  // Optional: Thumbnail key for videos
  @Column({ nullable: true })
  thumbnailKey?: string;

  @Column()
  tripId: number;

  @ManyToOne(() => Trip, (trip) => trip.mediaFiles, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}