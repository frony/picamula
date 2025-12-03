import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';
import { BackoffStrikeService } from '../services/backoff-strike.service';
import { getClientIp, normalizeIp } from '../utils';

/**
 * Custom exception filter for Throttler exceptions
 * Records strikes when rate limits are exceeded
 */
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ThrottlerExceptionFilter.name);

  constructor(private readonly backoffStrikeService: BackoffStrikeService) {}

  async catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const rawIp = getClientIp(request);
    const clientIP = normalizeIp(rawIp);

    // Record the violation for this IP
    await this.backoffStrikeService.recordViolation(clientIP);

    // Get strike info to include in response
    const strikeInfo = await this.backoffStrikeService.getStrikeInfo(clientIP);
    
    this.logger.warn(
      `🚫 Throttler: Rate limit exceeded for IP ${clientIP} | Path: ${request.path} | Strikes: ${strikeInfo?.strikes || 0}`
    );

    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Rate limit exceeded. Please slow down.',
      strikes: strikeInfo?.strikes || 0,
      maxStrikes: 10,
      error: 'Too Many Requests',
    });
  }
}
