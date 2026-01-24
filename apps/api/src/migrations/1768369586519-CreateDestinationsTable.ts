import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class CreateDestinationsTable1768369586519 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create destinations table (without notes text column)
        await queryRunner.createTable(
            new Table({
                name: 'destinations',
                columns: [
                    { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
                    { name: 'name', type: 'varchar', length: '255' },
                    { name: 'order', type: 'int', default: 0 },
                    { name: 'arrivalDate', type: 'date', isNullable: true },
                    { name: 'departureDate', type: 'date', isNullable: true },
                    { name: 'latitude', type: 'decimal', precision: 10, scale: 7, isNullable: true },
                    { name: 'longitude', type: 'decimal', precision: 10, scale: 7, isNullable: true },
                    { name: 'tripId', type: 'int' },
                    { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true,
        );

        // Add foreign key: destinations -> trips
        await queryRunner.createForeignKey(
            'destinations',
            new TableForeignKey({
                columnNames: ['tripId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'trips',
                onDelete: 'CASCADE',
            }),
        );

        // Add destinationId column to notes table
        await queryRunner.addColumn(
            'notes',
            new TableColumn({
                name: 'destinationId',
                type: 'int',
                isNullable: true,
            }),
        );

        // Add foreign key: notes -> destinations
        await queryRunner.createForeignKey(
            'notes',
            new TableForeignKey({
                columnNames: ['destinationId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'destinations',
                onDelete: 'CASCADE',
            }),
        );

        // Optional: Migrate existing destination data from trips
        await queryRunner.query(`
      INSERT INTO destinations (name, "order", "tripId", "arrivalDate", "departureDate")
      SELECT destination, 0, id, "startDate", "endDate"
      FROM trips
      WHERE destination IS NOT NULL AND destination != ''
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove foreign key from notes
        const notesTable = await queryRunner.getTable('notes');
        const foreignKey = notesTable.foreignKeys.find(
            (fk) => fk.columnNames.indexOf('destinationId') !== -1,
        );
        if (foreignKey) {
            await queryRunner.dropForeignKey('notes', foreignKey);
        }

        // Remove destinationId column from notes
        await queryRunner.dropColumn('notes', 'destinationId');

        // Drop destinations table
        await queryRunner.dropTable('destinations');
    }
}