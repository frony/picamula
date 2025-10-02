import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import jwtConfig from '../config/jwt.config';
import { HashingService } from '../hashing/hashing.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  InvalidateRefreshTokenError,
  RefreshTokenIdsStorage,
} from './refresh-token-ids.storage';
import { RefreshTokenService, RefreshTokenReuseError, RefreshTokenExpiredError } from './refresh-token.service';
import { randomUUID } from 'crypto';
import { OtpAuthenticationService } from './otp-authentication.service';
import { UsersService } from '../../users/users.service';
import { AuthTokens } from './entities/auth-tokens.entity';
import { CreateUserDto } from '../../users/dto/create-user.dto';
type CreatedUser = Partial<
  Pick<CreateUserDto & User, 'firstName' | 'lastName' | 'email' | 'permissions'>
>;

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY) // lets us access the jwtConfig values
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly refreshTokenIdsStorage: RefreshTokenIdsStorage,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly otpAuthService: OtpAuthenticationService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a new user in the database
   * and log in the user
   * @param signUpDto
   */
  async signUp(signUpDto: SignUpDto): Promise<CreatedUser> {
    try {
      const password = await this.hashingService.hash(signUpDto.password);
      const { email, phone, firstName, lastName } = signUpDto;
      const newUser = {
        email,
        password,
        phone,
        firstName,
        lastName,
      };

      this.logger.log({ email, phone, firstName, lastName });

      const {
        firstName: createdFirstName,
        lastName: createdLastName,
        email: createdEmail,
        permissions,
      }: CreatedUser = await this.usersService.create({
        ...newUser,
      });
      return { firstName: createdFirstName, lastName: createdLastName, email: createdEmail, permissions };
    } catch (error) {
      // TODO: Move this to a constants file
      const pgUniqueViolationErrorCode = '23505';
      this.logger.error('SignUp error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        signUpDto: { email: signUpDto.email, firstName: signUpDto.firstName, lastName: signUpDto.lastName, phone: signUpDto.phone }
      });
      if (error.code === pgUniqueViolationErrorCode) {
        throw new ConflictException('Sign up failed. Please check your details or try a different email.');
      }
      throw new BadRequestException(error.message || 'Signup failed');
    }
  }

  /**
   * Log in the user
   * @param signInDto
   * @param ipAddress
   * @param userAgent
   */
  async signIn(signInDto: SignInDto, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersRepository.findOneBy({
      email: signInDto.email,
    });
    if (!user) {
      this.logger.error(`${signInDto.email}: User does not exist`);
      throw new UnauthorizedException('User does not exist');
    }

    this.logger.log(`User found: ${JSON.stringify({ id: user.id, email: user.email, isVerified: user.isVerified, isVerifiedType: typeof user.isVerified })}`);
    this.logger.log(`Raw user object: ${JSON.stringify(user, null, 2)}`);

    const isEqual = await this.hashingService.compare(
      signInDto.password,
      user.password,
    );
    if (!isEqual) {
      this.logger.error(`${signInDto.email}: Password  does not match`);
      throw new UnauthorizedException('Password  does not match');
    }

    this.logger.log(`Checking verification: isVerified=${user.isVerified}, type=${typeof user.isVerified}, strict false check=${user.isVerified === false}`);
    // TODO: Re-enable email verification once email configuration is fixed
    // if (user.isVerified === false) {
    //   this.logger.error(`${signInDto.email}: Email not verified`);
    //   throw new UnauthorizedException('Please verify your email before logging in');
    // }
    this.logger.log(`Email verification temporarily disabled for development`);

    if (user.isTfaEnabled) {
      const isValid = this.otpAuthService.verifyCode(
        signInDto.tfaCode,
        user.tfaSecret,
      );
      if (!isValid) {
        this.logger.error('Invalid 2FA code');
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }
    const { email, firstName, lastName } = user;
    this.logger.log({ email, firstName, lastName });
    return await this.generateTokens(user, ipAddress, userAgent);
  }

  /**
   * Create the JWT token
   * @param userId
   * @param expiresIn
   * @param payload
   * @private
   */
  private async signToken<T>(userId: number, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
        expiresIn,
      },
    );
  }

  /**
   * Generate both access and refresh tokens
   * @param user
   */
  async generateTokens(user, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshTokenId = randomUUID();
    const expiresAt = new Date(Date.now() + this.jwtConfiguration.refreshTokenTtl * 1000);
    
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<ActiveUserData>>(
        user.id,
        this.jwtConfiguration.accessTokenTtl,
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          // Not recommended: it can add a long string of permissions to the token
          // and the token won't be lightweight.
          // In production, we could store an array of ids from the DB, or, most likely
          // retrieve it from the DB in each request
          permissions: user.permissions,
        },
      ),
      // TODO: Add interface to describe the refreshToken structure
      this.signToken(user.id, this.jwtConfiguration.refreshTokenTtl, {
        refreshTokenId,
      }),
    ]);

    // Store in both Redis (for backward compatibility) and database
    await Promise.all([
      this.refreshTokenIdsStorage.insert(user.id, refreshTokenId),
      this.refreshTokenService.createTokenFamily(user.id, refreshTokenId, expiresAt, ipAddress, userAgent),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh an expired access token
   * @param refreshTokenDto
   */
  async refreshTokens(refreshTokenDto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    try {
      const { sub, refreshTokenId } = await this.jwtService.verifyAsync<
        Pick<ActiveUserData, 'sub'> & { refreshTokenId: string }
      >(refreshTokenDto.refreshToken, {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
      });
      
      const user = await this.usersRepository.findOneByOrFail({
        id: sub,
      });

      // Validate token using new service
      const token = await this.refreshTokenService.validateToken(user.id, refreshTokenId);
      
      // Check for potential token reuse
      const isReused = await this.refreshTokenService.detectTokenReuse(user.id, token.familyId);
      if (isReused) {
        // Revoke entire family as security measure
        await this.refreshTokenService.revokeTokenFamily(user.id, token.familyId);
        this.logger.warn(`Potential refresh token reuse detected for user ${user.id}, family ${token.familyId}`);
        throw new UnauthorizedException('Security violation detected');
      }

      // Rotate tokens
      const newTokenId = randomUUID();
      const expiresAt = new Date(Date.now() + this.jwtConfiguration.refreshTokenTtl * 1000);
      
      await this.refreshTokenService.rotateToken(
        user.id,
        refreshTokenId,
        newTokenId,
        expiresAt,
        ipAddress,
        userAgent,
      );

      // Also update Redis for backward compatibility
      await this.refreshTokenIdsStorage.invalidate(user.id);
      await this.refreshTokenIdsStorage.insert(user.id, newTokenId);

      return this.generateTokens(user, ipAddress, userAgent);
    } catch (error) {
      if (error instanceof RefreshTokenReuseError) {
        this.logger.error(`Refresh token reuse detected: ${error.message}`);
        throw new UnauthorizedException('Security violation detected');
      }
      if (error instanceof RefreshTokenExpiredError) {
        this.logger.error(`Refresh token expired: ${error.message}`);
        throw new UnauthorizedException('Refresh token expired');
      }
      if (error instanceof InvalidateRefreshTokenError) {
        // TODO: Take action: notify user that his refresh token may have been compromised
        throw new UnauthorizedException('Access denied');
      }
      throw new UnauthorizedException();
    }
  }

  /**
   * Logout user and revoke all refresh tokens
   * @param userId
   */
  async logout(userId: number): Promise<void> {
    await Promise.all([
      this.refreshTokenService.revokeAllUserTokens(userId),
      this.refreshTokenIdsStorage.invalidate(userId),
    ]);
  }

  /**
   * Revoke specific refresh token
   * @param userId
   * @param userId
   * @param tokenId
   */
  async revokeToken(userId: number, tokenId: string): Promise<void> {
    await Promise.all([
      this.refreshTokenService.revokeToken(userId, tokenId),
      this.refreshTokenIdsStorage.invalidate(userId),
    ]);
  }
}
