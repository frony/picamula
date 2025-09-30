import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './bcrypt.service';
import { AuthenticationController } from './authentication/authentication.controller';
import { AuthenticationService } from './authentication/authentication.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationGuard } from './authentication/guards/authentication/authentication.guard';
import { AccessTokenGuard } from './authentication/guards/access-token/access-token.guard';
import { RefreshTokenIdsStorage } from './authentication/refresh-token-ids.storage';
import { RolesGuard } from './authorization/guards/roles.guard';
import { PermissionsGuard } from './authorization/guards/permissions.guard';
import { PolicyHandlerStorage } from './authorization/policies/policy-handler.storage';
import { FrameworkContributorPolicyHandler } from './authorization/framework-contributor.policy';
import { PoliciesGuard } from './authorization/guards/policies.guard';
import { ApiKeysService } from './authentication/api-keys.service';
import { ApiKey } from '../users/api-keys/entities/api-key.entity';
import { ApiKeyGuard } from './authentication/guards/api-key/api-key.guard';
import { GoogleAuthenticationService } from './authentication/social/google-authentication.service';
import { GoogleAuthenticationController } from './authentication/social/google-authentication.controller';
import { OtpAuthenticationService } from './authentication/otp-authentication.service';
import { SessionAuthenticationController } from './authentication/session-authentication.controller';
import { SessionAuthenticationService } from './authentication/session-authentication.service';
import { UserSerializer } from './authentication/serializers/user-serializer';
import { UsersModule } from '../users/users.module';
import { PasswordService } from './authentication/password.service';
import { PasswordResetToken } from './authentication/entities/password-reset-token.entity';
import { RefreshToken } from './authentication/entities/refresh-token.entity';
import { RefreshTokenService } from './authentication/refresh-token.service';
import { RefreshTokenCleanupService } from './authentication/refresh-token-cleanup.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey, PasswordResetToken, RefreshToken]),
    JwtModule.registerAsync(jwtConfig.asProvider()), // The asProvider method converts a factory to match the expected async module's configuration object
    ConfigModule.forFeature(jwtConfig), // So it can be injected by authentication service
    UsersModule,
    MailModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    {
      // HashingService is an abstract class, and it can't be registered as a provider
      // as it cannot be instantiated
      // Whenever the hashing token is resolved, it will point to BcryptService
      // HashingService will serve as an abstract interface
      // while BcryptService is the implementation of that service
      provide: HashingService,
      useClass: BcryptService,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PoliciesGuard,
    },
    AccessTokenGuard, // Register as a provider so that it becomes injectable by the AuthenticationGuard
    ApiKeyGuard, // Register as a provider so that it becomes injectable by the AuthenticationGuard
    RefreshTokenIdsStorage,
    RefreshTokenService,
    RefreshTokenCleanupService,
    AuthenticationService,
    PolicyHandlerStorage,
    FrameworkContributorPolicyHandler,
    ApiKeysService,
    GoogleAuthenticationService,
    OtpAuthenticationService,
    SessionAuthenticationService,
    UserSerializer,
    PasswordService,
  ],
  controllers: [
    AuthenticationController,
    GoogleAuthenticationController,
    SessionAuthenticationController,
  ],
})
export class IamModule {}
