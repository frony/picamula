import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { isEmpty } from 'lodash';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomCacheService {
  private readonly logger = new Logger(CustomCacheService.name);
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Builds cache key (literal CACHE_<KEY>_KEY) and gets TTL from env (CACHE_<KEY>_TTL).
   * Same key is used for set and get.
   */
  private getCacheConfig(key: string) {
    if (!key) {
      throw new Error('getCacheConfig: Cache key is required');
    }
    const ttl = Number(this.configService.get(`CACHE_${key.toUpperCase()}_TTL`));
    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw new Error('Cache TTL must be a positive number');
    }
    return {
      key: `CACHE_${key.toUpperCase()}_KEY`,
      ttl,
    };
  }

  getCacheTtl(key: string) {
    const ttl = Number(this.configService.get(`CACHE_${key.toUpperCase()}_TTL`));
    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw new Error('Cache TTL must be a positive number');
    }
    return ttl ?? 2592000;
  }

  async get(cacheKey: string) {
    try {
      if (isEmpty(cacheKey)) {
        throw new Error('get: Cache key is required');
      }
      const { key } = this.getCacheConfig(cacheKey);
      if (isEmpty(key)) {
        throw new Error(`get (this.getCacheConfig(cacheKey)): Cache key is required: ${cacheKey}`);
      }
      const value = await this.cacheManager.get(key);
      if (isEmpty(value)) {
        return null;
      }
      return value as string;
    } catch (error) {
      this.logger.error(`Error getting cache: ${error.message}`, error.stack);
      return null;
    }
  }

  async set(cacheKey: string, value: any) {
    if (isEmpty(cacheKey)) {
      throw new Error('set: Cache key is required');
    }
    if (isEmpty(value)) {
      throw new Error('Cache value is required');
    }
    try {
      const { key, ttl } = this.getCacheConfig(cacheKey);
      if (isEmpty(key)) {
        throw new Error(`set (this.getCacheConfig(cacheKey)): Cache key is required: ${cacheKey}`);
      }
      if (!ttl) {
        throw new Error('Cache TTL is required');
      }
      this.logger.debug(`CustomCache set: key=${key} ttl=${ttl}s`);
      return this.cacheManager.set(key, value, ttl * 1000);
    } catch (error) {
      this.logger.error(`Error setting cache: ${error.message}`, error.stack);
    }
  }

  async delete(cacheKey: string) {
    if (isEmpty(cacheKey)) {
      throw new Error('Cache key is required');
    }
    try {
      const { key } = this.getCacheConfig(cacheKey);
      if (isEmpty(key)) {
        throw new Error('Cache key is required');
      }
      return this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache: ${error.message}`, error.stack);
      return false;
    }
  }
}
