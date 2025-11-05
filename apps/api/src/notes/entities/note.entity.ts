import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Trip } from '../../trips/entities/trip.entity';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('notes')
export class Note {
  @ApiProperty({
    example: 'uuid-string',
    description: 'The unique identifier for the note',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Remember to pack sunscreen and bring the camera for sunset photos.',
    description: 'The content of the note',
  })
  @Column('text')
  content: string;

  @ApiProperty({
    example: '2024-03-15T10:30:00Z',
    description: 'The date associated with the note',
  })
  @Column('timestamp')
  date: Date;

  @ApiProperty({
    description: 'The trip this note belongs to',
  })
  @ManyToOne(() => Trip, (trip) => trip.notes, { 
    onDelete: 'CASCADE',
    nullable: false 
  })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Column()
  tripId: number;

  @ApiProperty({
    description: 'The user who created this note',
  })
  @ManyToOne(() => User, { 
    eager: true,
    nullable: false 
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: number;

  @ApiProperty({
    example: '2024-03-15T10:30:00Z',
    description: 'When the note was created',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2024-03-15T10:30:00Z',
    description: 'When the note was last updated',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
