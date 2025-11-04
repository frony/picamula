import { MigrationInterface, QueryRunner } from "typeorm";

export class TripAddSlugAndChangeIdToNumber1730568000000 implements MigrationInterface {
    name = 'TripAddSlugAndChangeIdToNumber1730568000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Add a new temporary numeric ID column
        await queryRunner.query(`ALTER TABLE "trips" ADD "new_id" SERIAL`);
        
        // Step 2: Add the slug column with UUID values
        await queryRunner.query(`ALTER TABLE "trips" ADD "slug" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "UQ_trips_slug" UNIQUE ("slug")`);
        
        // Step 3: Copy existing UUID IDs to slug column (preserve old IDs as slugs)
        await queryRunner.query(`UPDATE "trips" SET "slug" = "id"::uuid`);
        
        // Step 4: Drop foreign key constraint from notes table if it exists
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "FK_notes_trip"`);
        
        // Step 5: Add temporary column in notes to store new trip IDs
        await queryRunner.query(`ALTER TABLE "notes" ADD "new_trip_id" integer`);
        
        // Step 6: Update notes to use new numeric IDs
        await queryRunner.query(`
            UPDATE "notes" n 
            SET "new_trip_id" = t."new_id" 
            FROM "trips" t 
            WHERE n."tripId" = t."id"::text
        `);
        
        // Step 6a: Verify all notes were mapped (safety check)
        const unmappedNotes = await queryRunner.query(`
            SELECT COUNT(*) as count FROM "notes" WHERE "new_trip_id" IS NULL
        `);
        if (parseInt(unmappedNotes[0].count) > 0) {
            throw new Error(`Migration failed: ${unmappedNotes[0].count} notes could not be mapped to new trip IDs. This indicates orphaned notes in the database.`);
        }
        
        // Step 7: Drop old tripId column from notes
        await queryRunner.query(`ALTER TABLE "notes" DROP COLUMN "tripId"`);
        
        // Step 8: Rename new_trip_id to tripId in notes
        await queryRunner.query(`ALTER TABLE "notes" RENAME COLUMN "new_trip_id" TO "tripId"`);
        
        // Step 9: Drop the old UUID id column from trips
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "PK_trips"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "id"`);
        
        // Step 10: Rename new_id to id and make it primary key
        await queryRunner.query(`ALTER TABLE "trips" RENAME COLUMN "new_id" TO "id"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "PK_trips" PRIMARY KEY ("id")`);
        
        // Step 11: Re-add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "notes" 
            ADD CONSTRAINT "FK_notes_trip" 
            FOREIGN KEY ("tripId") 
            REFERENCES "trips"("id") 
            ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Drop foreign key
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "FK_notes_trip"`);
        
        // Step 2: Add back UUID id column
        await queryRunner.query(`ALTER TABLE "trips" ADD "new_id" uuid DEFAULT uuid_generate_v4()`);
        
        // Step 3: Copy slug values back to new UUID id
        await queryRunner.query(`UPDATE "trips" SET "new_id" = "slug"`);
        
        // Step 4: Add temporary column in notes for UUID trip IDs
        await queryRunner.query(`ALTER TABLE "notes" ADD "new_trip_id" uuid`);
        
        // Step 5: Update notes with UUID values from slug
        await queryRunner.query(`
            UPDATE "notes" n 
            SET "new_trip_id" = t."slug" 
            FROM "trips" t 
            WHERE n."tripId" = t."id"
        `);
        
        // Step 6: Drop numeric tripId from notes
        await queryRunner.query(`ALTER TABLE "notes" DROP COLUMN "tripId"`);
        
        // Step 7: Rename new_trip_id to tripId
        await queryRunner.query(`ALTER TABLE "notes" RENAME COLUMN "new_trip_id" TO "tripId"`);
        
        // Step 8: Drop numeric id primary key
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "PK_trips"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "id"`);
        
        // Step 9: Rename new_id to id and make it primary key
        await queryRunner.query(`ALTER TABLE "trips" RENAME COLUMN "new_id" TO "id"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "PK_trips" PRIMARY KEY ("id")`);
        
        // Step 10: Drop slug column
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "UQ_trips_slug"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "slug"`);
        
        // Step 11: Re-add foreign key
        await queryRunner.query(`
            ALTER TABLE "notes" 
            ADD CONSTRAINT "FK_notes_trip" 
            FOREIGN KEY ("tripId") 
            REFERENCES "trips"("id") 
            ON DELETE CASCADE
        `);
    }
}
