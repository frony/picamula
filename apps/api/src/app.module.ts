import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { MailerModule } from '@nestjs-modules/mailer';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER } from '@nestjs/core';
import { IamModule } from './iam/iam.module';
import { UsersModule } from './users/users.module';
import { TripsModule } from './trips/trips.module';
import { TodosModule } from './todos/todos.module';
import { NotesModule } from './notes/notes.module';
import { TripExpensesModule } from './expenses/trip-expenses.module';
import { S3Module } from './s3/s3.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { IpBackoffMiddleware } from './common/middleware/ip-backoff.middleware';
import { BackoffStrikeMiddleware } from './common/middleware/backoff-strike.middleware';
import { BackoffStrikeService } from './common/services/backoff-strike.service';
import { BackoffStrikeController } from './common/controllers/backoff-strike.controller';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import * as redisStore from 'cache-manager-redis-store';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',           // Project root (when running from root with PM2)
        '../../.env',     // From apps/api (development)
        '../../../.env',  // From apps/api/dist (compiled)
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Debug logging
        const dbHost = configService.get('DB_HOST', 'localhost');
        const dbPort = parseInt(configService.get('DB_PORT', '5432'), 10);
        const dbUsername = configService.get('DB_USERNAME', 'postgres');
        const dbPassword = configService.get('DB_PASSWORD', 'password');
        const dbName = configService.get('DB_NAME', 'junta_tribo');

        console.log('=== DATABASE CONNECTION DEBUG ===');
        console.log('Host:', dbHost);
        console.log('Port:', dbPort, 'Type:', typeof dbPort);
        console.log('Username:', dbUsername);
        console.log('Database:', dbName);
        console.log('================================');

        return {
          type: 'postgres',
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          password: dbPassword,
          database: dbName,
          autoLoadEntities: true,
          // synchronize: true,
          logging: true,
          migrations: ['dist/database/migrations/*.js'],
          migrationsTableName: 'migrations',
          // Connection retry options
          retryAttempts: 10,
          retryDelay: 3000,
          connectTimeoutMS: 10000,
          extra: {
            max: 10, // Maximum pool size
            connectionTimeoutMillis: 10000,
          },
        };
      },
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const redisPort = configService.get('REDIS_PORT', '6379');
        const redisPassword = configService.get('REDIS_PASSWORD');

        console.log('=== REDIS CONNECTION DEBUG ===');
        console.log('ConfigService REDIS_HOST:', redisHost);
        console.log('ConfigService REDIS_PORT:', redisPort);
        console.log('Parsed REDIS_PORT:', parseInt(redisPort, 10));
        console.log('==============================');

        return {
          ttl: 60 * 60 * 2 * 1000, // 2 hours
          max: 10, // maximum number of items in cache
          store: redisStore,
          host: redisHost,
          port: parseInt(redisPort, 10),
          password: redisPassword,
        };
      },
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Debug email configuration
        console.log('=== EMAIL CONFIGURATION DEBUG ===');
        console.log('ConfigService EMAIL_HOST:', configService.get<string>('EMAIL_HOST'));
        console.log('ConfigService EMAIL_PORT:', configService.get<string>('EMAIL_PORT'));
        console.log('ConfigService EMAIL_USERNAME:', configService.get<string>('EMAIL_USERNAME'));
        console.log('Direct process.env.EMAIL_HOST:', process.env.EMAIL_HOST);
        console.log('Direct process.env.EMAIL_PORT:', process.env.EMAIL_PORT);
        console.log('Direct process.env.EMAIL_USERNAME:', process.env.EMAIL_USERNAME);
        console.log('==================================');

        // Use direct env vars as fallback
        const emailHost = configService.get<string>('EMAIL_HOST') || process.env.EMAIL_HOST;
        const emailPort = configService.get<string>('EMAIL_PORT') || process.env.EMAIL_PORT;
        const emailUsername = configService.get<string>('EMAIL_USERNAME') || process.env.EMAIL_USERNAME;
        const emailPassword = configService.get<string>('EMAIL_PASSWORD') || process.env.EMAIL_PASSWORD;

        return {
          transport: {
            host: emailHost,
            port: parseInt(emailPort, 10),
            secure: false, // true for 465, false for other ports
            auth: {
              user: emailUsername,
              pass: emailPassword,
            },
          },
        };
      },
    }),
    // Throttler Module - Multi-tier rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const shortTtl = parseInt(config.get('THROTTLER_SHORT_TTL', '1000'), 10);
        const shortLimit = parseInt(config.get('THROTTLER_SHORT_LIMIT', '5'), 10);
        const mediumTtl = parseInt(config.get('THROTTLER_MEDIUM_TTL', '10000'), 10);
        const mediumLimit = parseInt(config.get('THROTTLER_MEDIUM_LIMIT', '30'), 10);
        const longTtl = parseInt(config.get('THROTTLER_LONG_TTL', '60000'), 10);
        const longLimit = parseInt(config.get('THROTTLER_LONG_LIMIT', '150'), 10);

        const redisHost = config.get('REDIS_HOST', 'localhost');
        const redisPort = parseInt(config.get('REDIS_PORT', '6379'), 10);
        const redisPassword = config.get('REDIS_PASSWORD');

        // Validate configuration
        if (shortTtl <= 0 || shortLimit <= 0) {
          throw new Error('Invalid THROTTLER_SHORT configuration');
        }
        if (mediumTtl <= 0 || mediumLimit <= 0) {
          throw new Error('Invalid THROTTLER_MEDIUM configuration');
        }
        if (longTtl <= 0 || longLimit <= 0) {
          throw new Error('Invalid THROTTLER_LONG configuration');
        }

        return [
          {
            name: 'short',
            ttl: shortTtl,
            limit: shortLimit,
            storage: new ThrottlerStorageRedisService({ host: redisHost, port: redisPort, password: redisPassword }),
          },
          {
            name: 'medium',
            ttl: mediumTtl,
            limit: mediumLimit,
            storage: new ThrottlerStorageRedisService({ host: redisHost, port: redisPort, password: redisPassword }),
          },
          {
            name: 'long',
            ttl: longTtl,
            limit: longLimit,
            storage: new ThrottlerStorageRedisService({ host: redisHost, port: redisPort, password: redisPassword }),
          },
        ];
      },
    }),
    IamModule,
    UsersModule,
    TripsModule,
    TodosModule,
    NotesModule,
    TripExpensesModule,
    S3Module,
  ],
  controllers: [BackoffStrikeController],
  providers: [
    BackoffStrikeService,
    {
      provide: APP_FILTER,
      useClass: ThrottlerExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware in order:
    // 1. Logging - logs all requests
    consumer.apply(LoggingMiddleware).forRoutes('*');

    // 2. BackoffStrike - checks if IP has too many violations
    consumer.apply(BackoffStrikeMiddleware).forRoutes('*');

    // 3. IP Backoff - enforces basic rate limiting
    consumer.apply(IpBackoffMiddleware).forRoutes('*');
  }
}
