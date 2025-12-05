import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateTripExpensesTable1733200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create trip_expenses table
    await queryRunner.createTable(
      new Table({
        name: 'trip_expenses',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'date',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['flight', 'lodging', 'transportation', 'meal', 'snack', 'groceries', 'entertainment', 'other'],
            default: "'other'",
            isNullable: false,
          },
          {
            name: 'memo',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'double precision',
            isNullable: false,
          },
          {
            name: 'tripId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'paidById',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key constraint to trips table
    await queryRunner.createForeignKey(
      'trip_expenses',
      new TableForeignKey({
        columnNames: ['tripId'],
        referencedTableName: 'trips',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_trip_expenses_trip',
      }),
    );

    // Create foreign key constraint to users table (paidBy)
    await queryRunner.createForeignKey(
      'trip_expenses',
      new TableForeignKey({
        columnNames: ['paidById'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        name: 'FK_trip_expenses_paidBy',
      }),
    );

    // Create index on tripId for better query performance
    await queryRunner.query(
      `CREATE INDEX "IDX_trip_expenses_tripId" ON "trip_expenses" ("tripId")`,
    );

    // Create index on paidById for better query performance
    await queryRunner.query(
      `CREATE INDEX "IDX_trip_expenses_paidById" ON "trip_expenses" ("paidById")`,
    );

    // Create index on date for sorting
    await queryRunner.query(
      `CREATE INDEX "IDX_trip_expenses_date" ON "trip_expenses" ("date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_trip_expenses_date"`);
    await queryRunner.query(`DROP INDEX "IDX_trip_expenses_paidById"`);
    await queryRunner.query(`DROP INDEX "IDX_trip_expenses_tripId"`);

    // Drop foreign keys
    await queryRunner.dropForeignKey('trip_expenses', 'FK_trip_expenses_paidBy');
    await queryRunner.dropForeignKey('trip_expenses', 'FK_trip_expenses_trip');

    // Drop table
    await queryRunner.dropTable('trip_expenses');
  }
}
