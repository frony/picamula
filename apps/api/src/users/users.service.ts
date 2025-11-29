import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRedux } from './entities/user.entity';
import { Repository } from 'typeorm';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    private readonly mailService: MailService,
  ) {}

  private getUserRedux(user) {
    const { id, firstName, lastName, email, phone, role, permissions, isTfaEnabled } = user;
    return { id, firstName, lastName, email, phone, role, permissions, isTfaEnabled };
  }

  /**
   * Add user to the database
   * @param createUserDto
   */
  async create(createUserDto: CreateUserDto): Promise<UserRedux> {
    try {
      const newUser = await this.userRepository.save(createUserDto);
      // Generate token
      const token = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(32).toString('hex');
      const ttl = parseInt(process.env.SIGNUP_VERIFICATION_TOKEN_TTL || '3600000', 10); // Default 1 hour in ms
      const expiresAt = new Date(Date.now() + ttl);
      const verification = this.emailVerificationTokenRepository.create({
        token,
        user: newUser,
        expiresAt,
        used: false,
      });
      await this.emailVerificationTokenRepository.save(verification);
      // Send email (don't let email failure prevent user creation)
      try {
        // AUTH_URL must be set in production to your actual domain (e.g., https://juntatribo.com)
        // In development, defaults to localhost:3003
        const baseUrl = process.env.AUTH_URL || (process.env.NODE_ENV === 'production' 
          ? 'https://juntatribo.com' 
          : 'http://localhost:3003');
        const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
        await this.mailService.sendMail({
          email: newUser.email,
          subject: 'Verify your email - JuntaTribo',
          message: `Please verify your email by clicking the following link: ${verifyUrl}`,
          htmlMessage: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">Welcome to JuntaTribo!</h2>
              <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
              <p style="margin: 30px 0;">
                <a href="${verifyUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
              </p>
              <p style="color: #6B7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p style="color: #6B7280; font-size: 14px; word-break: break-all;">${verifyUrl}</p>
              <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour.</p>
              <p style="color: #6B7280; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
            </div>
          `
        });
        this.logger.log(`Verification email sent successfully to ${newUser.email}`);
      } catch (emailError) {
        this.logger.warn(`Failed to send verification email to ${newUser.email}, but user creation will continue:`, emailError.message);
        // Don't throw - let user creation succeed even if email fails
      }
      return this.getUserRedux(newUser);
    } catch (error) {
      this.logger.error('User creation error:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        createUserDto: { email: createUserDto.email, firstName: createUserDto.firstName, lastName: createUserDto.lastName, phone: createUserDto.phone }
      });
      if (error.code === '23505') throw error; // Let unique constraint errors bubble up
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Return all users
   * TODO: Add pagination
   */
  async findAll() {
    try {
      // const users = await this.userRepository.find({
      //   relations: { videos: true },
      // });
      const users = await this.userRepository.find();
      if (!users || users.length < 1) {
        throw new NotFoundException(`No users were found`);
      }
      return users.map((user) => this.getUserRedux(user));
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`No users were found`);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Find a user by ID
   * @param id
   */
  async findOne(id: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        // relations: { videos: true },
      });
      if (!user) {
        throw new NotFoundException(`User #${id} not found`);
      }
      return this.getUserRedux(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`User #${id} not found`);
      }
      throw new BadRequestException(error.message);
    }
  }

  async findOneByEmail(email: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        // relations: { videos: true },
      });
      if (!user) {
        throw new NotFoundException(`${email} not found`);
      }
      return this.getUserRedux(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`${email} not found`);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update user in the database
   * @param id
   * @param updateUserDto
   */
  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.userRepository.preload({
        id: +id,
        ...updateUserDto,
      });
      if (!user) {
        throw new NotFoundException(`User #${id} not found`);
      }
      await this.userRepository.save(user);
      return this.getUserRedux(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`User #${id} not found`);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Delete user from the database
   * @param id
   */
  async remove(id: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        // relations: { videos: true },
      });
      if (!user) {
        throw new NotFoundException(`User #${id} not found`);
      }
      await this.userRepository.remove(user);
      return this.getUserRedux(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`User #${id} not found`);
      }
      throw new BadRequestException(error.message);
    }
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    const { token } = verifyEmailDto;
    
    const verificationToken = await this.emailVerificationTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verificationToken.used) {
      throw new BadRequestException('Token has already been used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Token has expired');
    }

    // Update user as verified
    await this.userRepository.update(verificationToken.user.id, { isVerified: true });
    
    // Mark token as used
    await this.emailVerificationTokenRepository.update(verificationToken.id, { used: true });

    return { message: 'Email verified successfully' };
  }
}
