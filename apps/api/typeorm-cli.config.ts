import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { User } from './src/users/entities/user.entity';
import { Trip } from './src/trips/entities/trip.entity';
import { Note } from './src/notes/entities/note.entity';
import { MediaFile } from './src/trips/entities/media-file.entity';
import { TodoItem } from './src/todos/todo-item.entity';
import { ApiKey } from './src/users/api-keys/entities/api-key.entity';
import { RefreshToken } from './src/iam/authentication/entities/refresh-token.entity';
import { EmailVerificationToken } from './src/users/entities/email-verification-token.entity';
import { PasswordResetToken } from './src/iam/authentication/entities/password-reset-token.entity';
import { EmailConfirmation } from './src/iam/authentication/entities/email-confirmation.entity';
import { UserReplaceNameByFirstAndLastName1759355264384 } from './src/migrations/1759355264384-UserReplaceNameByFirstAndLastName';
import { TripAddSlugAndChangeIdToNumber1730568000000 } from './src/migrations/1730568000000-TripAddSlugAndChangeIdToNumber';
import { CreateMediaFileTable1732406400000 } from './src/migrations/1732406400000-CreateMediaFileTable';
import { CreateEmailVerificationTokenTable1759360000000 } from './src/migrations/1759360000000-CreateEmailVerificationTokenTable';
import { AddIsVerifiedToUser1759360100000 } from './src/migrations/1759360100000-AddIsVerifiedToUser';
import { CreateTripTodoItemsTable1733000000000 } from './src/migrations/1733000000000-CreateTripTodoItemsTable';
import { UpdateTripTodoItemsToUserRelation1733100000000 } from './src/migrations/1733100000000-UpdateTripTodoItemsToUserRelation';

// Load .env from project root
config({ path: join(__dirname, '../../../.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5435,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User,
    Trip,
    Note,
    MediaFile,
    TodoItem,
    ApiKey,
    RefreshToken,
    EmailVerificationToken,
    PasswordResetToken,
    EmailConfirmation,
  ],
  migrations: [
    TripAddSlugAndChangeIdToNumber1730568000000,
    CreateMediaFileTable1732406400000,
    CreateTripTodoItemsTable1733000000000,
    UpdateTripTodoItemsToUserRelation1733100000000,
    UserReplaceNameByFirstAndLastName1759355264384,
    CreateEmailVerificationTokenTable1759360000000,
    AddIsVerifiedToUser1759360100000,
  ],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: false,
});