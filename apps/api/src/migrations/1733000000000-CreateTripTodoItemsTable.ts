import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateTripTodoItemsTable1733000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create trip_todo_items table
    await queryRunner.createTable(
      new Table({
        name: 'trip_todo_items',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'completed'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'tripId',
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
      'trip_todo_items',
      new TableForeignKey({
        columnNames: ['tripId'],
        referencedTableName: 'trips',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_trip_todo_items_trip',
      }),
    );

    // Create index on tripId for better query performance
    await queryRunner.createIndex(
      'trip_todo_items',
      new TableIndex({
        name: 'IDX_trip_todo_items_tripId',
        columnNames: ['tripId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('trip_todo_items', 'IDX_trip_todo_items_tripId');

    // Drop foreign key
    await queryRunner.dropForeignKey('trip_todo_items', 'FK_trip_todo_items_trip');

    // Drop table
    await queryRunner.dropTable('trip_todo_items');
  }
}
