import { Module } from '@nestjs/common';
import { CustomCacheService } from './cache.service';
import { CustomCacheController } from './cache.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [CustomCacheService],
  exports: [CustomCacheService],
  imports: [ConfigModule],
  controllers: [CustomCacheController],
})
export class CustomCacheModule {}
