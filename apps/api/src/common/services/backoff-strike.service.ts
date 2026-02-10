import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

interface StrikeRecord {
  strikes: number;
  lastViolation: number;
  blockedUntil: number;
}

@Injectable()
export class BackoffStrikeService {
  private readonly logger = new Logger(BackoffStrikeService.name);
  private readonly whitelistedIPs: string[];
  private readonly baseBlockTime = 1000; // 1 second
  private readonly maxStrikes = 10;
  private readonly cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {
    // Get whitelisted IPs from config
    const whitelist = this.configService.get('IP_WHITELIST', '');
    this.whitelistedIPs = [
      '127.0.0.1',
      '::1',
      'localhost',
      ...whitelist.split(',').filter(ip => ip.trim()).map(ip => ip.trim()),
    ];

    this.logger.log(
      `BackoffStrike initialized - Max strikes: ${this.maxStrikes}, Cooldown: ${this.cooldownPeriod / 1000}s`
    );
  }

  /**
   * Check if an IP is whitelisted
   */
  isWhitelisted(clientIP: string): boolean {
    return this.whitelistedIPs.includes(clientIP);
  }

  /**
   * Check if IP is currently blocked
   */
  async isIPBlocked(clientIP: string): Promise<boolean> {
    const strikeKey = `strikes:${clientIP}`;

    try {
      const strikeData = await this.cacheManager.get<string>(strikeKey);
      if (!strikeData) {
        return false;
      }

      const record: StrikeRecord = JSON.parse(strikeData);
      const isBlocked = Date.now() < record.blockedUntil;

      if (isBlocked) {
        const remainingMs = record.blockedUntil - Date.now();
        this.logger.debug(
          `IP ${clientIP} is blocked (${record.strikes} strikes, ${Math.ceil(remainingMs / 1000)}s remaining)`
        );
      }

      return isBlocked;
    } catch (error) {
      this.logger.error(`Error checking if IP blocked: ${error.message}`);
      return false;
    }
  }

  /**
   * Check and reset strikes if cooldown period has passed
   */
  async checkAndResetStrikes(clientIP: string): Promise<void> {
    const strikeKey = `strikes:${clientIP}`;

    try {
      const strikeData = await this.cacheManager.get<string>(strikeKey);
      if (!strikeData) {
        return;
      }

      const record: StrikeRecord = JSON.parse(strikeData);
      const now = Date.now();

      // Reset strikes if cooldown period has passed since last violation
      if (now - record.lastViolation > this.cooldownPeriod) {
        await this.cacheManager.del(strikeKey);
        this.logger.log(
          `Strikes reset for IP ${clientIP} after ${this.cooldownPeriod / 1000}s cooldown`
        );
      }
    } catch (error) {
      this.logger.error(`Error resetting strikes: ${error.message}`);
    }
  }

  /**
   * Record a violation for an IP
   */
  async recordViolation(clientIP: string): Promise<void> {
    const strikeKey = `strikes:${clientIP}`;

    try {
      const strikeData = await this.cacheManager.get<string>(strikeKey);
      const now = Date.now();

      let record: StrikeRecord;

      if (strikeData) {
        record = JSON.parse(strikeData);
        record.strikes = Math.min(record.strikes + 1, this.maxStrikes);
      } else {
        record = {
          strikes: 1,
          lastViolation: now,
          blockedUntil: 0,
        };
      }

      record.lastViolation = now;

      // Calculate block duration using exponential backoff
      const blockDuration = this.calculateBlockDuration(record.strikes);
      record.blockedUntil = now + blockDuration;

      // Store in cache with expiration (use longer of block duration or cooldown period)
      const expirationTime = Math.max(blockDuration, this.cooldownPeriod) / 1000; // Convert to seconds
      await this.cacheManager.set(strikeKey, JSON.stringify(record), {
        ttl: expirationTime,
      } as any);

      this.logger.warn(
        `🎯 Strike recorded for IP ${clientIP}: ${record.strikes}/${this.maxStrikes} strikes, blocked for ${this.formatDuration(blockDuration)}`
      );
    } catch (error) {
      this.logger.error(`Error recording violation: ${error.message}`);
    }
  }

  /**
   * Calculate exponential backoff duration
   * 1s, 2s, 4s, 8s, 16s, 32s, 1min, 2min, 4min, 8min, 16min
   */
  private calculateBlockDuration(strikes: number): number {
    if (strikes <= 6) {
      return this.baseBlockTime * Math.pow(2, strikes - 1);
    } else {
      // After 6 strikes, use minutes instead of seconds
      const minutes = Math.pow(2, strikes - 6);
      return minutes * 60 * 1000;
    }
  }

  /**
   * Format duration for logging
   */
  private formatDuration(ms: number): string {
    if (ms < 60000) {
      return `${ms / 1000}s`;
    }
    return `${Math.round(ms / 60000)}min`;
  }

  /**
   * Get current strike information for an IP (for monitoring/debugging)
   */
  async getStrikeInfo(clientIP: string): Promise<StrikeRecord | null> {
    const strikeKey = `strikes:${clientIP}`;

    try {
      const strikeData = await this.cacheManager.get<string>(strikeKey);

      if (!strikeData) {
        return null;
      }

      return JSON.parse(strikeData);
    } catch (error) {
      this.logger.error(`Error getting strike info: ${error.message}`);
      return null;
    }
  }

  /**
   * Manually reset strikes for an IP (for admin use)
   */
  async resetStrikes(clientIP: string): Promise<void> {
    const strikeKey = `strikes:${clientIP}`;
    await this.cacheManager.del(strikeKey);
    this.logger.log(`Strikes manually reset for IP ${clientIP}`);
  }

  /**
   * Get all IPs with strikes (for admin monitoring)
   * Note: cache-manager v7 doesn't expose store.keys() directly
   * This returns an empty array - check specific IPs instead
   */
  async getAllStrikesInfo(): Promise<Array<{ ip: string; record: StrikeRecord }>> {
    // cache-manager v7 limitation: can't list all keys
    // In production, use Redis directly or track IPs separately
    this.logger.warn('getAllStrikesInfo: Not supported with cache-manager v7. Check specific IPs using getStrikeInfo(ip) instead.');
    return [];
  }
}
