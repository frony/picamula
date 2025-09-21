import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { MailerModule } from '@nestjs-modules/mailer';
import { IamModule } from './iam/iam.module';
import { UsersModule } from './users/users.module';
import { TripsModule } from './trips/trips.module';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '../../.env',           // For development
        '../../../.env',        // For production (from dist folder)
        '.env'                  // Fallback to local .env
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Debug logging
        console.log('=== DATABASE CONNECTION DEBUG ===');
        console.log('Host:', configService.get('DB_HOST', 'localhost'));
        console.log('Port:', configService.get('DB_PORT', 5432));
        console.log('Username:', configService.get('DB_USERNAME', 'postgres'));
        console.log('Database:', configService.get('DB_NAME', 'junta_tribo'));
        console.log('================================');
        
        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', 'password'),
          database: configService.get('DB_NAME', 'junta_tribo'),
          autoLoadEntities: true,
          synchronize: true,
          logging: true,
          migrations: ['dist/database/migrations/*.js'],
          migrationsTableName: 'migrations',
        };
      },
      inject: [ConfigService],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 60 * 2 * 1000, // 2 hours
      max: 10, // maximum number of items in cache
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD,
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('EMAIL_HOST'),
          port: parseInt(configService.get<string>('EMAIL_PORT'), 10),
          secure: false, // true for 465, false for other ports
          auth: {
            user: configService.get<string>('EMAIL_USERNAME'),
            pass: configService.get<string>('EMAIL_PASSWORD'),
          },
        },
      }),
    }),
    IamModule,
    UsersModule,
    TripsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
