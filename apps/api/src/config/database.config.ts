import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Trip } from '../trips/entities/trip.entity';

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'postgres'),
      password: this.configService.get('DB_PASSWORD', 'password'),
      database: this.configService.get('DB_NAME', 'junta_tribo'),
      entities: [User, Trip],
      synchronize: this.configService.get('NODE_ENV') !== 'production',
      logging: this.configService.get('NODE_ENV') === 'development',
      migrations: ['dist/database/migrations/*.js'],
      migrationsTableName: 'migrations',
    };
  }
}
