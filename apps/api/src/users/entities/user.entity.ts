import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../enums/role.enum';
// import { Role } from './role.entity';
import {
  Permission,
  PermissionType,
} from '../../iam/authorization/permission.type';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { Trip } from '../../trips/entities/trip.entity';
import { Note } from '../../notes/entities/note.entity';
// import { Video } from '../../video/entities/video.entity';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity()
export class User extends BaseEntity {
  @ApiProperty({
    example: '1234',
    description: 'The user index in the database',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 'my_username',
    description: 'The username to display',
  })
  @Column({ nullable: true })
  name: string;

  @ApiProperty({
    example: 'joe.doe@example.com',
    description: "User's email",
  })
  @Column({ unique: true })
  email: string;

  @ApiProperty({
    example: '$asdf2btEjJhlEp9Ty...',
    description: 'The hashed password',
  })
  @Column({ nullable: true })
  password: string;

  @ApiProperty({
    example: '555-987-6543',
    description: `User's phone number`,
  })
  @Column({ nullable: true })
  phone?: string;

  @ApiProperty({
    example: 'Role.Regular',
    description: 'Permission roles for the user',
  })
  @Column({ enum: Role, default: Role.Regular })
  role: Role;
  // @OneToOne(() => Role)
  // @JoinColumn()
  // role?: Role;

  @ApiProperty({
    example: false,
    description: 'State of TFA enabled: true | false',
  })
  @Column({ default: false })
  isTfaEnabled: boolean;

  @ApiProperty({
    description: 'String of TFA secret',
  })
  @Column({ nullable: true })
  tfaSecret: string;

  @ApiProperty({
    example: '1234aksdjhcnjkdc...',
    description: 'OAuth token from Google',
  })
  @Column({ nullable: true })
  googleId?: string;

  /**
   * NOTE: Adding both Role and permissions
   * won't make much sense in production.
   * Using it here for testing.
   * It would be a many-to-many relationship between
   * the users and the permissions table
   */
  @ApiProperty({
    example: '[Permission.CreatePage, Permission.UpdatePage]',
    description: "List of user's auth permissions",
  })
  @Column({ enum: Permission, default: [], type: 'json' })
  permissions: PermissionType[];

  @ApiProperty({
    example: '[ApiKey]',
    description: 'List of API keys for the user',
  })
  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys: ApiKey[];

  @ApiProperty({
    example: 'true | false',
    description: 'Has the user email been verified?',
  })
  @Column({ name: 'is_verified', default: false })
  isVerified: boolean = false;

  @ApiProperty({
    example: '[Trip]',
    description: 'List of trips created by the user',
  })
  @OneToMany(() => Trip, (trip) => trip.owner)
  trips: Trip[];

  @ApiProperty({
    example: '[Note]',
    description: 'List of notes created by the user',
  })
  @OneToMany(() => Note, (note) => note.author)
  notes: Note[];

  // @ApiProperty({
  //   example: '[Video]',
  //   description: 'List of videos uploaded by the user',
  // })
  // @JoinTable()
  // @OneToMany(() => Video, (video) => video.user, {
  //   nullable: true,
  //   cascade: true,
  // })
  // @Field(() => [Video], { nullable: true })
  // videos?: Video[];
}

@Entity()
export class UserRedux {
  @ApiProperty({
    example: 1,
    description: `User's ID`,
  })
  id: number;

  @ApiProperty({
    example: 'Joe DOe',
    description: `The user's name`,
  })
  name: string;

  @ApiProperty({
    example: 'joe.doe@example.com',
    description: "User's email",
  })
  email: string;

  @ApiProperty({
    example: '555-987-6543',
    description: `User's phone number`,
  })
  phone?: string;

  @ApiProperty({
    example: 'Role.Regular',
    description: 'Permission roles for the user',
  })
  role?: Role;

  /**
   * NOTE: Adding both Role and permissions
   * won't make much sense in production.
   * Using it here for testing.
   * It would be a many-to-many relationship between
   * the users and the permissions table
   * Instead of an enum, there should be a DB table
   * with a many-to-many relationship.
   */
  @ApiProperty({
    example: '[Permission.CreatePage, Permission.UpdatePage]',
    description: "List of user's auth permissions",
  })
  permissions?: PermissionType[];

  @ApiProperty({
    example: 'true | false',
    description: 'Is two-factor authorization enabled?',
  })
  isTfaEnabled?: boolean;

  @ApiProperty({
    example: '[ApiKey]',
    description: 'List of API keys for the user',
  })
  apiKeys?: ApiKey[];

  // @ApiProperty({
  //   example: '[Video]',
  //   description: 'List of videos uploaded by the user',
  // })
  // @Field(() => [Video], { nullable: true })
  // videos?: Video[];
}
