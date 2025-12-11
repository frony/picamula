import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Res,
  Req,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { AuthType } from './enums/auth-type.enum';
import { Auth } from './decorators/auth.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ActiveUser } from '../decorators/active-user.decorator';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { OtpAuthenticationService } from './otp-authentication.service';
import { Response, Request } from 'express';
import { toFileStream } from 'qrcode';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthTokensDto } from './dto/auth-tokens.dto';
// import { Roles } from '../authorization/decorators/roles.decorator';
// import { Role } from '../../users/enums/role.enum';
import { PasswordService } from './password.service';
import { TokenIdentifier } from '../interfaces/token-identifier';
import { LogoutDto } from './dto/logout.dto';
import { getAltchaHmacKey } from '../../common/utils/altcha';

@Auth(AuthType.None)
@ApiTags('authentication')
@Controller('authentication')
export class AuthenticationController {
  private readonly logger = new Logger(AuthenticationController.name);

  constructor(
    private readonly authService: AuthenticationService,
    private readonly otpAuthService: OtpAuthenticationService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Create a new user in the database
   * and log in the user
   * @param signUpDto
   */
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({
    status: 200,
    description:
      'Save user in the database and return accessToken and refreshToken tokens',
    type: AuthTokensDto,
  })
  @HttpCode(HttpStatus.OK) // Return 200 instead of NestJS default 201
  @Post('sign-up')
  signUp(@Body() signUpDto: SignUpDto) {
    this.logger.log(`sign-up: ${JSON.stringify(signUpDto)}`);
    return this.authService.signUp(signUpDto);
  }

  /**
   * Log in the user
   * @param signInDto
   */
  @ApiOperation({ summary: 'Log in the user' })
  @ApiResponse({
    status: 200,
    description: 'Create accessToken and refreshToken tokens',
    type: AuthTokensDto,
  })
  @HttpCode(HttpStatus.OK) // Return 200 instead of NestJS default 201
  @Post('sign-in')
  async signIn(
    @Body() signInDto: SignInDto, 
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    this.logger.log(`sign-in: ${JSON.stringify(signInDto)}`);
    
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    const { accessToken, refreshToken } = await this.authService.signIn(signInDto, ipAddress, userAgent);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '300', 10),
    });
    // Return both tokens - cookie for traditional clients, body for NextAuth
    return { accessToken, refreshToken };
  }

  /**
   * Refresh an expired access token
   * @param refreshTokenDto
   */
  @ApiOperation({
    summary: 'Refresh an expired access_token',
  })
  @ApiResponse({
    status: 200,
    description: 'Refresh accessToken via refreshToken',
    type: AuthTokensDto,
  })
  @HttpCode(HttpStatus.OK) // Return 200 instead of NestJS default 201
  @Post('refresh-tokens')
  async refreshToken(
    @Res({ passthrough: true }) res: Response, 
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // The refreshTokenDto is not needed anymore, but keep for compatibility
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    const { accessToken, refreshToken } = await this.authService.refreshTokens(refreshTokenDto, ipAddress, userAgent);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '300', 10),
    });
    // Return both tokens - cookie for traditional clients, body for NextAuth
    return { accessToken, refreshToken };
  }

  /**
   * Generate QR code for 2FA sign in
   * @param activeUser
   * @param response
   */
  @ApiOperation({
    summary: 'Generate a QR code for two-factor authentication',
  })
  @Auth(AuthType.Bearer)
  // @Permissions(['developer'])
  @HttpCode(HttpStatus.OK)
  @Post('2fa/generate')
  async generateQrCode(
    @ActiveUser() activeUser: ActiveUserData,
    @Res() response: Response,
  ): Promise<void> {
    const { secret, uri } = await this.otpAuthService.generateSecret(
      activeUser.email,
    );
    await this.otpAuthService.enableTfaForUser(activeUser.email, secret);
    response.type('png');
    return toFileStream(response, uri);
  }

  @HttpCode(HttpStatus.OK)
  @Post('sendResetToken')
  async sendResetPasswordToken(@Body() tokenIdentifier: TokenIdentifier) {
    return this.passwordService.sendResetToken(tokenIdentifier);
  }

  @HttpCode(HttpStatus.OK)
  @Get('validateResetToken/:token')
  async validateResetToken(@Param('token') token: string) {
    return this.passwordService.validateResetToken(token);
  }

  @Auth(AuthType.Bearer)
  @HttpCode(HttpStatus.OK)
  @Post('updatePassword')
  async updatePassword(
    @ActiveUser() activeUser: ActiveUserData,
    @Body() newPassword: Record<string, string>,
  ) {
    const { password } = newPassword;
    return this.passwordService.updatePassword(activeUser, password);
  }

  /**
   * Logout user and revoke refresh tokens
   * @param activeUser
   * @param logoutDto
   */
  @ApiOperation({
    summary: 'Logout user and revoke refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully',
  })
  @Auth(AuthType.Bearer)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @ActiveUser() activeUser: ActiveUserData,
    @Body() logoutDto?: LogoutDto,
  ): Promise<{ message: string }> {
    if (logoutDto?.tokenId) {
      await this.authService.revokeToken(activeUser.sub, logoutDto.tokenId);
      return { message: 'Token revoked successfully' };
    } else {
      await this.authService.logout(activeUser.sub);
      return { message: 'Logged out successfully' };
    }
  }

  /**
   * Get ALTCHA HMAC key for challenge generation
   * Public endpoint - needed for frontend to generate challenges
   */
  @ApiOperation({ summary: 'Get ALTCHA HMAC key' })
  @ApiResponse({
    status: 200,
    description: 'Returns the ALTCHA HMAC key',
  })
  @HttpCode(HttpStatus.OK)
  @Get('altcha/key')
  getAltchaKey(): { key: string } {
    return { key: getAltchaHmacKey() };
  }

  /**
   * Get user's active refresh tokens
   * @param activeUser
   */
  @ApiOperation({
    summary: 'Get user active refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active refresh tokens',
  })
  @Auth(AuthType.Bearer)
  @HttpCode(HttpStatus.OK)
  @Get('tokens')
  async getActiveTokens(@ActiveUser() activeUser: ActiveUserData) {
    // This would require adding a method to get tokens from the service
    // For now, return a placeholder
    return { message: 'Active tokens endpoint - to be implemented' };
  }
}
