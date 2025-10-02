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
        const baseUrl = process.env.AUTH_URL || 'http://localhost';
        const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
        await this.mailService.sendMail({
          email: newUser.email,
          subject: 'Verify your email',
          message: `Please verify your email by clicking the following link: ${verifyUrl}`,
          htmlMessage: `<p>Please verify your email by clicking the following link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
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
