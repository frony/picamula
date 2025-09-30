import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class PasswordResetToken {
  @ApiProperty({
    example: '1234',
    description: 'The password reset token index in the database',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: '1234',
    description: 'The hashed token',
  })
  @Column()
  token: string;

  @ApiProperty({
    example: '26409353197139',
    description:
      'The randomly generated Id for the apiKey. The product of Math.round(Math.random() * 100000000000000)',
  })
  @Column()
  randomUniqueId: string;

  @ApiProperty({
    example: '1726780277851',
    description: 'The ApiKey expiration time',
  })
  @Column({ type: 'bigint' })
  ttl: number;

  @ApiProperty({
    example: 'joe.doe@example.com',
    description: 'The email this token is associated with',
  })
  @Column()
  email: string;
}
