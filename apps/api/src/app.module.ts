import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { MailerModule } from '@nestjs-modules/mailer';
import { IamModule } from './iam/iam.module';
import { UsersModule } from './users/users.module';
import { TripsModule } from './trips/trips.module';
import { NotesModule } from './notes/notes.module';
import * as redisStore from 'cache-manager-redis-store';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),  // Absolute path to root .env
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
    IamModule,
    UsersModule,
    TripsModule,
    NotesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
