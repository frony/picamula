import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailVerificationTokenTable1759360000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable('email_verification_token');
    
    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "email_verification_token" (
          "id" SERIAL PRIMARY KEY,
          "token" VARCHAR NOT NULL UNIQUE,
          "expiresAt" TIMESTAMP NOT NULL,
          "used" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "userId" INTEGER,
          CONSTRAINT "FK_email_verification_token_user" FOREIGN KEY ("userId") 
            REFERENCES "user"("id") ON DELETE CASCADE
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "email_verification_token"
    `);
  }
}
