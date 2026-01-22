import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveBudgetCommentFromTrip1768500050000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('trips', 'budgetComment');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'trips',
      new TableColumn({
        name: 'budgetComment',
        type: 'text',
        isNullable: true,
      }),
    );
  }
}
