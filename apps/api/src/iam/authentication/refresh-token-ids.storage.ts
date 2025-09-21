import {
  // Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
// import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

// TODO: Move this to a dedicated file
export class InvalidateRefreshTokenError extends Error {}

@Injectable()
export class RefreshTokenIdsStorage
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(private readonly configService: ConfigService) {}

  private redisClient: Redis;
  onApplicationBootstrap(): any {
    // TODO: Move this to a dedicated Redis module
    // instead of initiating the connection here
    this.redisClient = new Redis({
      // host: 'localhost',
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
      // port: 6379,
    });
  }

  /**
   * When the application shuts down,
   * the Redis connection will be terminated,
   * which is ideal in order to clean up resources
   * @param signal
   */
  onApplicationShutdown(signal?: string): any {
    return this.redisClient.quit();
  }
  // constructor(@Inject(CACHE_MANAGER) private cacheService: Cache) {}

  /**
   * Insert a new tokenId into Redis
   * under a specified key (user-${userId})
   * @param userId
   * @param tokenId
   */
  async insert(userId: number, tokenId: string): Promise<void> {
    await this.redisClient.set(this.getKey(userId), tokenId);
    // await this.cacheService.set(this.getKey(userId), tokenId);
  }

  /**
   * Ensure the tokenId matches the one saved in the database
   * @param userId
   * @param tokenId
   */
  async validate(userId: number, tokenId: string): Promise<boolean> {
    const storedId = await this.redisClient.get(this.getKey(userId));
    // const storedId = await this.cacheService.get(this.getKey(userId));
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
    await this.redisClient.del(this.getKey(userId));
    // await this.cacheService.del(this.getKey(userId));
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
