import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeExpenseAmountToDecimal1734220000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change amount column from double precision to decimal(10,2) for proper monetary storage
    await queryRunner.query(`
      ALTER TABLE "trip_expenses" 
      ALTER COLUMN "amount" TYPE decimal(10,2) 
      USING "amount"::decimal(10,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to double precision
    await queryRunner.query(`
      ALTER TABLE "trip_expenses" 
      ALTER COLUMN "amount" TYPE double precision 
      USING "amount"::double precision
    `);
  }
}

