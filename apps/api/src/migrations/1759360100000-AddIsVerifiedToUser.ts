import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsVerifiedToUser1759360100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists before adding it
    const table = await queryRunner.getTable('user');
    const hasIsVerified = table?.columns.find(column => column.name === 'is_verified');
    
    if (!hasIsVerified) {
      await queryRunner.query(`
        ALTER TABLE "user" 
        ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user');
    const hasIsVerified = table?.columns.find(column => column.name === 'is_verified');
    
    if (hasIsVerified) {
      await queryRunner.query(`
        ALTER TABLE "user" 
        DROP COLUMN "is_verified"
      `);
    }
  }
}
