import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStartCityToTrip1734300000000 implements MigrationInterface {
  name = 'AddStartCityToTrip1734300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add startCity column with default empty string for existing records
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "startCity" character varying(100) NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "startCity"`);
  }
}
