import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { getClientIp, normalizeIp } from '../utils';

@Injectable()
export class IpBackoffMiddleware implements NestMiddleware {
  private readonly MAX_REQUESTS: number; // Max requests in window for general routes
  private readonly WINDOW_SIZE_MS: number; // Window for general routes
  private readonly BACKOFF_DURATION_MS: number; // Backoff duration
  private readonly MAX_BACKOFFS: number = 3; // Number of backoffs before permanent block
  private readonly logger = new Logger(IpBackoffMiddleware.name);
  private readonly WHITELISTED_IPS: string[] = [];
  
  // Stricter limits for authentication routes
  private readonly AUTH_MAX_REQUESTS: number;
  private readonly AUTH_WINDOW_SIZE_MS: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // General route limits (lenient for normal browsing)
    this.MAX_REQUESTS = parseInt(
      this.configService.get('BACKOFF_MAX_REQUESTS') || '100',
      10,
    );
    this.WINDOW_SIZE_MS = parseInt(
      this.configService.get('BACKOFF_WINDOW_SIZE_MS') || '60000',
      10,
    );
    this.BACKOFF_DURATION_MS = parseInt(
      this.configService.get('BACKOFF_DURATION_MS') || '300000',
      10,
    );

    // Strict limits for authentication routes
    this.AUTH_MAX_REQUESTS = parseInt(
      this.configService.get('AUTH_MAX_REQUESTS') || '5',
      10,
    );
    this.AUTH_WINDOW_SIZE_MS = parseInt(
      this.configService.get('AUTH_WINDOW_SIZE_MS') || '10000',
      10,
    );

    // Get whitelisted IPs from environment or config
    const whitelist = this.configService.get('IP_WHITELIST');
    if (whitelist) {
      this.WHITELISTED_IPS = whitelist.split(',').map((ip) => ip.trim());
      this.logger.log(
        `Initialized IP whitelist with ${this.WHITELISTED_IPS.length} addresses`,
      );
    }

    this.logger.log(
      `Rate limits initialized - General: ${this.MAX_REQUESTS}/${this.WINDOW_SIZE_MS}ms, Auth: ${this.AUTH_MAX_REQUESTS}/${this.AUTH_WINDOW_SIZE_MS}ms`,
    );
  }

  /**
   * Determine if this is an authentication-related route that needs stricter limits
   */
  private isAuthRoute(path: string): boolean {
    const authPaths = [
      '/auth/sign-in',
      '/auth/sign-up',
      '/auth/signin',
      '/auth/signup',
      '/authentication/sign-in',
      '/authentication/sign-up',
      '/iam/authentication',
      '/login',
      '/register',
    ];
    
    return authPaths.some(authPath => path.toLowerCase().includes(authPath.toLowerCase()));
  }

  /**
   * Get rate limit configuration based on route type
   */
  private getRateLimitConfig(path: string): { maxRequests: number; windowSize: number; routeType: string } {
    if (this.isAuthRoute(path)) {
      return {
        maxRequests: this.AUTH_MAX_REQUESTS,
        windowSize: this.AUTH_WINDOW_SIZE_MS,
        routeType: 'AUTH',
      };
    }
    
    return {
      maxRequests: this.MAX_REQUESTS,
      windowSize: this.WINDOW_SIZE_MS,
      routeType: 'GENERAL',
    };
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const rawIp = getClientIp(req);
    const ip = normalizeIp(rawIp);
    const currentTime = Date.now();

    // Check if IP is whitelisted - bypass all restrictions
    if (this.WHITELISTED_IPS.includes(ip)) {
      this.logger.debug(`Whitelisted IP ${ip} - bypassing rate limits`);
      return next();
    }

    // Get route-specific configuration
    const { maxRequests, windowSize, routeType } = this.getRateLimitConfig(req.path);

    // Key names - include route type to separate auth from general rate limits
    const requestsKey = `rate-limit:${routeType}:requests:${ip}`;
    const backoffKey = `rate-limit:backoff:${ip}`;
    const backoffCountKey = `rate-limit:backoff-count:${ip}`;
    const blockedKey = `rate-limit:blocked:${ip}`;

    try {
      // First check if this IP is permanently blocked
      const isBlocked = await this.cacheManager.get<boolean>(blockedKey);

      if (isBlocked) {
        // LOG BLOCKED IPS
        this.logger.warn(`❌ BLOCKED IP attempting access: ${ip} | Path: ${req.path} | Method: ${req.method}`);
        
        throw new HttpException(
          {
            message:
              'Access denied. This IP has been blocked due to excessive requests.',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      // Then check if this IP is in a backoff period
      const backoffUntil = await this.cacheManager.get<number>(backoffKey);

      if (backoffUntil) {
        if (currentTime < backoffUntil) {
          // Still in backoff period
          const remainingSeconds = Math.ceil(
            (backoffUntil - currentTime) / 1000,
          );

          // LOG BACKOFF VIOLATIONS
          this.logger.warn(`⏸️  IP in backoff period: ${ip} | Remaining: ${remainingSeconds}s | Path: ${req.path}`);

          throw new HttpException(
            {
              message: `Too many requests. Please try again after ${remainingSeconds} seconds.`,
              retryAfter: remainingSeconds,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        } else {
          // Backoff period expired, remove the flag
          await this.cacheManager.del(backoffKey);
        }
      }

      // Get the request timestamps array or create empty one
      const timestamps: number[] =
        (await this.cacheManager.get(requestsKey)) || [];

      // Filter to only keep timestamps within our window
      const windowStart = currentTime - windowSize;
      const recentTimestamps = timestamps.filter((ts) => ts > windowStart);

      if (recentTimestamps.length >= maxRequests) {
        // Too many requests in the window, apply backoff
        const backoffUntil = currentTime + this.BACKOFF_DURATION_MS;

        // Increment backoff count
        const currentBackoffCount =
          (await this.cacheManager.get<number>(backoffCountKey)) || 0;
        const newBackoffCount = currentBackoffCount + 1;

        // Store updated backoff count (with a longer TTL)
        // Using 24 hours as the retention period for the backoff count
        const BACKOFF_COUNT_TTL = 24 * 60 * 60; // 24 hours in seconds
        await this.cacheManager.set(backoffCountKey, newBackoffCount, {
          ttl: BACKOFF_COUNT_TTL,
        } as any);

        // LOG RATE LIMIT EXCEEDED WITH IP
        this.logger.warn(
          `🚨 RATE LIMIT EXCEEDED [${routeType}]: IP ${ip} | Count: ${newBackoffCount}/${this.MAX_BACKOFFS} | Path: ${req.path} | Method: ${req.method} | Limit: ${maxRequests}/${windowSize}ms`,
        );

        // Check if we need to permanently block this IP
        if (newBackoffCount >= this.MAX_BACKOFFS) {
          // Permanent block (or at least very long - 30 days)
          const BLOCK_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
          await this.cacheManager.set(blockedKey, true, {
            ttl: BLOCK_TTL,
          } as any);

          // LOG PERMANENT BLOCK
          this.logger.error(
            `🔒 PERMANENTLY BLOCKED: IP ${ip} after ${this.MAX_BACKOFFS} violations | Path: ${req.path}`,
          );

          throw new HttpException(
            {
              message:
                'Access denied. This IP has been blocked due to excessive requests.',
            },
            HttpStatus.FORBIDDEN,
          );
        }

        // Set backoff key with expiration
        await this.cacheManager.set(backoffKey, backoffUntil, {
          ttl: Math.ceil(this.BACKOFF_DURATION_MS / 1000),
        } as any);

        // Clear request history since we're now in backoff mode
        await this.cacheManager.del(requestsKey);

        this.logger.warn(
          `⏸️  BACKOFF INITIATED: IP ${ip} until ${new Date(backoffUntil).toISOString()} | Violation ${newBackoffCount}/${this.MAX_BACKOFFS}`,
        );

        throw new HttpException(
          {
            message: `Too many requests. Please try again after ${this.BACKOFF_DURATION_MS / 1000
              } seconds.`,
            retryAfter: this.BACKOFF_DURATION_MS / 1000,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Add current timestamp to the list
      recentTimestamps.push(currentTime);

      // Store updated timestamps with TTL
      await this.cacheManager.set(requestsKey, recentTimestamps, {
        ttl: Math.ceil(windowSize / 1000) + 5,
      } as any);

      this.logger.debug(
        `✅ Request from ${ip} allowed [${routeType}] (${recentTimestamps.length}/${maxRequests}) | Path: ${req.path}`,
      );

      // Allow request to proceed
      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error in rate limiter: ${error.message}`);
      next(error);
    }
  }
}
