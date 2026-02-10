import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

// TODO: Move this to a dedicated file
export class InvalidateRefreshTokenError extends Error {}

@Injectable()
export class RefreshTokenIdsStorage {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Insert a new tokenId into Redis
   * under a specified key (user-${userId})
   * TTL matches the refresh token expiration
   * @param userId
   * @param tokenId
   */
  async insert(userId: number, tokenId: string): Promise<void> {
    const ttlSeconds = this.configService.get<number>('JWT_REFRESH_TOKEN_TTL');
    const ttlMs = ttlSeconds * 1000;
    await this.cacheService.set(this.getKey(userId), tokenId, ttlMs);
  }

  /**
   * Ensure the tokenId matches the one saved in the database
   * @param userId
   * @param tokenId
   */
  async validate(userId: number, tokenId: string): Promise<boolean> {
    const storedId = await this.cacheService.get(this.getKey(userId));
    if (storedId !== tokenId) {
      throw new InvalidateRefreshTokenError();
    }
    return storedId === tokenId;
  }

  /**
   * Delete a specific entry from the database.
   * If someone tries to use a token that was once valid,
   * our validate method will return false since the userId
   * doesn't exist in the database anymore.
   * @param userId
   */
  async invalidate(userId: number): Promise<void> {
    await this.cacheService.del(this.getKey(userId));
  }

  /**
   * Generate a Redis key to identify a user
   * @param userId
   * @private
   */
  private getKey(userId: number): string {
    return `user-${userId}`;
  }
}
