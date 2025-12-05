import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Generated,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Note } from '../../notes/entities/note.entity';
import { MediaFile } from './media-file.entity';
import { TripExpenses } from '../../expenses/entities/trip-expense.entity';

export enum TripStatus {
  PLANNING = 'planning',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Generated('uuid')
  slug: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column()
  destination: string;

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.PLANNING,
  })
  status: TripStatus;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget?: number;

  @Column('simple-json', { nullable: true })
  participants?: string[];

  @Column('simple-json', { nullable: true })
  itinerary?: any[];

  @OneToMany(() => Note, (note) => note.trip, { 
    cascade: true,
    eager: false 
  })
  notes: Note[];

  @OneToMany(() => MediaFile, (mediaFile) => mediaFile.trip, { 
    cascade: true,
    eager: false 
  })
  mediaFiles: MediaFile[];

  @OneToMany(() => TripExpenses, (expense) => expense.trip, {
    cascade: true,
    eager: false
  })
  expenses: TripExpenses[];

  @ManyToOne(() => User, (user) => user.trips, { eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
