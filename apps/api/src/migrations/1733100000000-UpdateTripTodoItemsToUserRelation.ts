import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTripTodoItemsToUserRelation1733100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tripId column exists before trying to drop it
    const tripIdExists = await queryRunner.hasColumn('trip_todo_items', 'tripId');
    
    if (tripIdExists) {
      // Drop the foreign key to trips if it exists
      const table = await queryRunner.getTable('trip_todo_items');
      const tripForeignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('tripId') !== -1,
      );
      if (tripForeignKey) {
        await queryRunner.dropForeignKey('trip_todo_items', tripForeignKey);
      }

      // Drop the tripId index if it exists
      try {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trip_todo_items_tripId"`);
      } catch (error) {
        // Index might not exist, ignore
      }

      // Drop the tripId column
      await queryRunner.query(`ALTER TABLE "trip_todo_items" DROP COLUMN "tripId"`);
    }

    // Check if userId column exists before trying to add it
    const userIdExists = await queryRunner.hasColumn('trip_todo_items', 'userId');
    
    if (!userIdExists) {
      // Add userId column
      await queryRunner.query(`ALTER TABLE "trip_todo_items" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1`);
    }

    // Check if foreign key exists before creating it
    const table = await queryRunner.getTable('trip_todo_items');
    const userForeignKeyExists = table.foreignKeys.some(
      (fk) => fk.columnNames.indexOf('userId') !== -1,
    );

    if (!userForeignKeyExists) {
      // Create foreign key constraint to user table
      await queryRunner.query(`
        ALTER TABLE "trip_todo_items"
        ADD CONSTRAINT "FK_trip_todo_items_user"
        FOREIGN KEY ("userId") REFERENCES "user"("id")
        ON DELETE CASCADE
      `);
    }

    // Check if index exists before creating it
    const indexExists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'trip_todo_items' 
      AND indexname = 'IDX_trip_todo_items_userId'
    `);

    if (!indexExists || indexExists.length === 0) {
      // Create index on userId for better query performance
      await queryRunner.query(`CREATE INDEX "IDX_trip_todo_items_userId" ON "trip_todo_items" ("userId")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop userId index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trip_todo_items_userId"`);

    // Drop foreign key to user
    const table = await queryRunner.getTable('trip_todo_items');
    const userForeignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('userId') !== -1,
    );
    if (userForeignKey) {
      await queryRunner.dropForeignKey('trip_todo_items', userForeignKey);
    }

    // Drop userId column if it exists
    const userIdExists = await queryRunner.hasColumn('trip_todo_items', 'userId');
    if (userIdExists) {
      await queryRunner.query(`ALTER TABLE "trip_todo_items" DROP COLUMN "userId"`);
    }

    // Add back tripId column if it doesn't exist
    const tripIdExists = await queryRunner.hasColumn('trip_todo_items', 'tripId');
    if (!tripIdExists) {
      await queryRunner.query(`ALTER TABLE "trip_todo_items" ADD COLUMN "tripId" INTEGER NOT NULL DEFAULT 1`);

      // Create foreign key constraint to trips table
      await queryRunner.query(`
        ALTER TABLE "trip_todo_items"
        ADD CONSTRAINT "FK_trip_todo_items_trip"
        FOREIGN KEY ("tripId") REFERENCES "trips"("id")
        ON DELETE CASCADE
      `);

      // Create index on tripId
      await queryRunner.query(`CREATE INDEX "IDX_trip_todo_items_tripId" ON "trip_todo_items" ("tripId")`);
    }
  }
}
