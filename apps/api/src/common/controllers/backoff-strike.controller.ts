import { Controller, Get, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { BackoffStrikeService } from '../services/backoff-strike.service';

/**
 * Admin controller for managing backoff strikes
 * TODO: Add authentication/authorization before using in production
 */
@Controller('admin/strikes')
export class BackoffStrikeController {
  constructor(private readonly backoffStrikeService: BackoffStrikeService) {}

  /**
   * Get strike information for a specific IP
   * GET /admin/strikes/:ip
   */
  @Get(':ip')
  async getStrikeInfo(@Param('ip') ip: string) {
    const strikeInfo = await this.backoffStrikeService.getStrikeInfo(ip);
    
    if (!strikeInfo) {
      return {
        ip,
        strikes: 0,
        status: 'clean',
      };
    }

    const now = Date.now();
    const isBlocked = now < strikeInfo.blockedUntil;
    const remainingMs = isBlocked ? strikeInfo.blockedUntil - now : 0;

    return {
      ip,
      strikes: strikeInfo.strikes,
      lastViolation: new Date(strikeInfo.lastViolation).toISOString(),
      blockedUntil: new Date(strikeInfo.blockedUntil).toISOString(),
      isBlocked,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      status: isBlocked ? 'blocked' : 'active',
    };
  }

  /**
   * Get all IPs with strikes
   * GET /admin/strikes
   */
  @Get()
  async getAllStrikes() {
    const allStrikes = await this.backoffStrikeService.getAllStrikesInfo();
    const now = Date.now();

    return {
      total: allStrikes.length,
      strikes: allStrikes.map(({ ip, record }) => ({
        ip,
        strikes: record.strikes,
        lastViolation: new Date(record.lastViolation).toISOString(),
        isBlocked: now < record.blockedUntil,
        remainingSeconds: now < record.blockedUntil 
          ? Math.ceil((record.blockedUntil - now) / 1000) 
          : 0,
      })),
    };
  }

  /**
   * Reset strikes for a specific IP
   * DELETE /admin/strikes/:ip
   */
  @Delete(':ip')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetStrikes(@Param('ip') ip: string) {
    await this.backoffStrikeService.resetStrikes(ip);
  }
}
