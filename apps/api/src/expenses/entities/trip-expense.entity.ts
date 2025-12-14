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

export enum ExpenseType {
  FLIGHT = 'flight',
  LODGING = 'lodging',
  TRANSPORTATION = 'transportation',
  MEAL = 'meal',
  SNACK = 'snack',
  GROCERIES = 'groceries',
  ENTERTAINMENT = 'entertainment',
  OTHER = 'other',
}


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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
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
