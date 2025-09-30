import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('refresh_tokens')
@Index(['userId', 'tokenId'], { unique: true })
@Index(['userId', 'familyId'])
@Index(['expiresAt'])
export class RefreshToken {
  @ApiProperty({
    example: 1,
    description: 'The refresh token ID',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 'uuid-string',
    description: 'Unique token identifier',
  })
  @Column({ type: 'uuid', unique: true })
  tokenId: string;

  @ApiProperty({
    example: 'uuid-string',
    description: 'Family identifier for token rotation',
  })
  @Column({ type: 'uuid' })
  familyId: string;

  @ApiProperty({
    example: 1,
    description: 'User ID who owns this token',
  })
  @Column()
  userId: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'When the token expires',
  })
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'When the token was created',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: false,
    description: 'Whether this token has been revoked',
  })
  @Column({ default: false })
  isRevoked: boolean;

  @ApiProperty({
    example: '192.168.1.1',
    description: 'IP address where token was created',
  })
  @Column({ nullable: true })
  createdFromIp?: string;

  @ApiProperty({
    example: 'Mozilla/5.0...',
    description: 'User agent when token was created',
  })
  @Column({ nullable: true })
  userAgent?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
} 