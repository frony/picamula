import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getClientIp, normalizeIp } from '../utils';
import { BackoffStrikeService } from '../services/backoff-strike.service';

@Injectable()
export class BackoffStrikeMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BackoffStrikeMiddleware.name);

  constructor(private readonly backoffStrikeService: BackoffStrikeService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const rawIp = getClientIp(req);
    const clientIP = normalizeIp(rawIp);

    // Skip middleware for whitelisted IPs
    if (this.backoffStrikeService.isWhitelisted(clientIP)) {
      this.logger.debug(`Whitelisted IP ${clientIP} - bypassing strike check`);
      return next();
    }

    try {
      // Check if IP is currently blocked due to strikes
      const isBlocked = await this.backoffStrikeService.isIPBlocked(clientIP);
      if (isBlocked) {
        const strikeInfo = await this.backoffStrikeService.getStrikeInfo(clientIP);
        const remainingMs = strikeInfo ? strikeInfo.blockedUntil - Date.now() : 0;
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        this.logger.warn(
          `⛔ Blocked IP ${clientIP} attempted access (${strikeInfo?.strikes} strikes, ${remainingSeconds}s remaining) | Path: ${req.path}`
        );

        throw new HttpException(
          {
            message: `Too many rate limit violations. Please try again after ${remainingSeconds} seconds.`,
            retryAfter: remainingSeconds,
            strikes: strikeInfo?.strikes,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Check if we should reset strikes (cooldown period passed)
      await this.backoffStrikeService.checkAndResetStrikes(clientIP);

      // Continue to next middleware/route
      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // If Redis error, log but allow request to continue (fail open)
      this.logger.error(`BackoffStrikeMiddleware error: ${error.message}`);
      next();
    }
  }
}
