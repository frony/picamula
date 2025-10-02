import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config(); // This loads environment variables from a `.env` file

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'picamula',
  entities: [
    'src/**/*.entity.ts',
  ],
  migrations: [
    'src/migrations/*.ts',
  ],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: false,
});