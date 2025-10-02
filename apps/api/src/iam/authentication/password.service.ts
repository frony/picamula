import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { Repository } from 'typeorm';
import { HashingService } from '../hashing/hashing.service';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { ApiKeysService } from './api-keys.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { TokenIdentifier } from '../interfaces/token-identifier';
import { randomUUID } from 'crypto';
import { MailService } from '../../mail/mail.service';
import { EmailTemplateService } from '../../mail/email-template.service';
import { ConfigService } from '@nestjs/config';
import { AuthenticationService } from './authentication.service';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly hashingService: HashingService,
    private readonly apiKeysService: ApiKeysService,
    private readonly mailService: MailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly authService: AuthenticationService,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async sendResetToken(tokenIdentifier: TokenIdentifier) {
    const { email } = tokenIdentifier;

    // ============================
    // Validate that email exists
    // ============================
    const user = await this.usersRepository.findOneBy({
      email,
    });
    if (!user) {
      throw new UnauthorizedException('User does not exist');
    }

    try {
      // ================
      // create a token
      // ================
      const randomUniqueId = randomUUID();
      const tokens = await this.apiKeysService.createAndHash(randomUniqueId);
      const { apiKey, hashedKey } = tokens;
      const now = new Date().getTime();
      const expiration = 5 * 60 * 1000; // 5 minutes

      const newToken = {
        token: hashedKey,
        randomUniqueId: randomUniqueId.toString(),
        ttl: now + expiration,
        email,
      };

      // =====================================
      // Check if there is an existing token
      // associated with this email
      // =====================================
      const existingToken = await this.passwordResetTokenRepository.findOneBy({
        email,
      });

      // ============================
      // if token exists, delete it
      // ============================
      if (existingToken) {
        await this.passwordResetTokenRepository.delete(existingToken.id);
      }

      // ===================
      // Save it in the DB
      // ===================
      this.passwordResetTokenRepository.save(newToken);

      // =====================
      // Send apiKey by email
      // =====================
      const resetPasswordUrl = `${this.configService.get(
        'RESET_PASSWORD_URL',
      )}?apiKey=${apiKey}`;
      
      this.logger.log(`Sending password reset email to ${email} with URL: ${resetPasswordUrl}`);
      
      await this.emailTemplateService.sendPasswordResetEmail({
        email,
        resetUrl: resetPasswordUrl,
      });
      
      this.logger.log(`Password reset email sent successfully to ${email}`);
      return apiKey;
    } catch (error) {
      this.logger.error(`Error in sendResetToken for ${email}:`, error);
      
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Access denied');
      }
      
      // Check if it's an email-related error
      if (error.message && error.message.includes('email')) {
        this.logger.error(`Email sending failed: ${error.message}`);
        throw new BadRequestException('Failed to send password reset email. Please try again later.', {
          cause: error,
          description: 'Email service error',
        });
      }
      
      throw new BadRequestException(error.message, {
        cause: error,
        description: error.message,
      });
    }
  }

  async validateResetToken(apiKey: string) {
    try {
      // =====================
      // Get token from user
      // =====================
      const hashedKeyFromApiKey =
        this.apiKeysService.extractHashedKeyFromApiKey(apiKey);
      const existingToken = await this.passwordResetTokenRepository.findOneBy({
        token: hashedKeyFromApiKey,
      });

      if (!existingToken) {
        throw new NotFoundException('Token is invalid');
      }

      const { id, token, ttl, email } = existingToken;

      // =====================
      // validate the apiKey
      // =====================
      await this.apiKeysService.validate(hashedKeyFromApiKey, token);

      // ==============
      // validate TTL
      // ==============
      const now = new Date().getTime();
      if (now > ttl) {
        throw new UnauthorizedException('Token is expired');
      }

      // ==============
      // validate user
      // ==============
      const user = await this.usersRepository.findOneBy({
        email,
      });
      if (!user) {
        throw new ForbiddenException('User does not exist');
      }

      // =================================
      // Delete token from DB
      // to prevent it from being reused
      // =================================
      await this.passwordResetTokenRepository.delete({ id });

      // ====================================
      // Return accessToken and refreshToken
      // ====================================
      return this.authService.generateTokens(user);
    } catch (error) {
      this.logger.error(`Error validating reset token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update password for an authenticated user
   * @param activeUser
   * @param password
   */
  async updatePassword(activeUser: ActiveUserData, password: string) {
    try {
      // ====================================
      // Get email and names from ActiveUser
      // ====================================
      const { email, firstName, lastName } = activeUser;

      // ==================
      // Get user from DB
      // ==================
      const user = await this.usersRepository.findOneBy({
        email: email,
      });
      if (!user) {
        return new UnauthorizedException('User does not exist');
      }

      // ======================
      // Encrypt the password
      // ======================
      const hashedPassword = await this.hashingService.hash(password);

      // ==================================
      // Update database with new password
      // ==================================
      await this.usersRepository.save({
        id: user.id,
        password: hashedPassword,
      });

      // =============================
      // Send confirmation to the FE
      // =============================
      return { name, email };
    } catch (error) {
      this.logger.log(error);
      return new BadRequestException(error.message);
    }
  }
}
