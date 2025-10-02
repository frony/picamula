import { MigrationInterface, QueryRunner } from "typeorm";

export class UserReplaceNameByFirstAndLastName1759355264384 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add firstName and lastName columns
        await queryRunner.query(`ALTER TABLE "user" ADD "firstName" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "user" ADD "lastName" character varying NOT NULL DEFAULT ''`);
        
        // Drop the name column
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "name"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back the name column
        await queryRunner.query(`ALTER TABLE "user" ADD "name" character varying NOT NULL DEFAULT ''`);
        
        // Drop firstName and lastName columns
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "firstName"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastName"`);
    }

}
