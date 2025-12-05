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
import { ExpenseType } from '@junta-tribo/shared';


@Entity('trip_expenses')
export class TripExpenses {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  date: string;

  @Column({
    type: 'enum',
    enum: ExpenseType,
    default: ExpenseType.OTHER,
  })
  type: ExpenseType;

  @Column()
  memo: string;

  @Column({ type: 'double precision' })
  amount: number;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Column()
  tripId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paidById' })
  paidBy: User;

  @Column()
  paidById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
