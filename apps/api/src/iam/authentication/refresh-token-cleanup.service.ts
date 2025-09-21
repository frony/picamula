import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  /**
   * Clean up expired refresh tokens every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredTokenCleanup() {
    try {
      const deletedCount = await this.refreshTokenService.cleanupExpiredTokens();
      this.logger.log(`Cleaned up ${deletedCount} expired refresh tokens`);
    } catch (error) {
      this.logger.error('Failed to clean up expired refresh tokens', error);
    }
  }

  /**
   * Clean up expired refresh tokens daily at 2 AM
   */
  @Cron('0 2 * * *')
  async handleDailyTokenCleanup() {
    try {
      const deletedCount = await this.refreshTokenService.cleanupExpiredTokens();
      this.logger.log(`Daily cleanup: Removed ${deletedCount} expired refresh tokens`);
    } catch (error) {
      this.logger.error('Failed to perform daily refresh token cleanup', error);
    }
  }
} 