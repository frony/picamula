import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCommentToTripExpenses1768500100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'trip_expenses',
      new TableColumn({
        name: 'comment',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('trip_expenses', 'comment');
  }
}
