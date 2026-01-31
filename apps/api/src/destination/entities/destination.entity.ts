import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Trip } from "../../trips/entities/trip.entity";
import type { Note } from "../../notes/entities/note.entity";
import { dateTransformer } from "../utils/date-transformer";

@Entity('destinations')
export class Destination {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // e.g., "Paris, France"

  @Column({ type: 'int', default: 0 })
  order: number;

  // Store as string (YYYY-MM-DD) to avoid timezone issues
  // The database column is DATE type, but we treat it as string in the app
  @Column('date', { nullable: true, transformer: dateTransformer })
  arrivalDate: string | null;

  @Column('date', { nullable: true, transformer: dateTransformer })
  departureDate: string | null;

  @Column({ type: 'decimal', default: 0 })
  latitude: number;

  @Column({ type: 'decimal', default: 0 })
  longitude: number;

  // One-to-Many: A destination can have multiple notes
  @OneToMany('Note', 'destination', {
    cascade: true,
    eager: false,
  })
  notes?: Note[];

  @ManyToOne(() => Trip, (trip) => trip.destinations, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Column()
  tripId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
