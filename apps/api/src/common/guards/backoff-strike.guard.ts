import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { BackoffStrikeService } from '../services/backoff-strike.service';
import { getClientIp, normalizeIp } from '../utils';

/**
 * Guard that records strike violations when throttler limits are exceeded
 * Works in conjunction with @nestjs/throttler
 */
@Injectable()
export class BackoffStrikeGuard implements CanActivate {
  private readonly logger = new Logger(BackoffStrikeGuard.name);

  constructor(private readonly backoffStrikeService: BackoffStrikeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawIp = getClientIp(request);
    const clientIP = normalizeIp(rawIp);

    try {
      // Let the request proceed - the throttler will handle rate limiting
      // This guard is here to catch ThrottlerExceptions and record strikes
      return true;
    } catch (error) {
      // If it's a throttler exception, record the violation
      if (error instanceof ThrottlerException) {
        await this.backoffStrikeService.recordViolation(clientIP);
        
        this.logger.warn(
          `Throttler violation by IP ${clientIP} | Path: ${request.path} | Method: ${request.method}`
        );
        
        // Re-throw the throttler exception
        throw new HttpException(
          'Rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      
      // Re-throw other exceptions
      throw error;
    }
  }
}
