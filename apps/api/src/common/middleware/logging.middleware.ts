import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getClientIp, normalizeIp } from '../utils';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const rawIp = getClientIp(req);
    const ip = normalizeIp(rawIp);
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    // Log request
    this.logger.log(`➡️  ${method} ${originalUrl} - ${ip} - ${userAgent}`);

    // Capture response
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const logLevel = statusCode >= 400 ? 'warn' : 'log';
      
      this.logger[logLevel](
        `⬅️  ${method} ${originalUrl} - ${statusCode} - ${duration}ms - ${ip}`,
      );
    });

    next();
  }
}
