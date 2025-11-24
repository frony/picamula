import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateMediaFileTable1732406400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create media_files table
    await queryRunner.createTable(
      new Table({
        name: 'media_files',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'key',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'url',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['image', 'video'],
            default: "'image'",
            isNullable: false,
          },
          {
            name: 'originalName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'mimeType',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'size',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'order',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'width',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'height',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'thumbnailKey',
            type: 'varchar',
            isNullable: true,
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
      'media_files',
      new TableForeignKey({
        columnNames: ['tripId'],
        referencedTableName: 'trips',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_media_files_trip',
      }),
    );

    // Create index on tripId for better query performance
    await queryRunner.query(
      `CREATE INDEX "IDX_media_files_tripId" ON "media_files" ("tripId")`,
    );

    // Create index on order for sorting
    await queryRunner.query(
      `CREATE INDEX "IDX_media_files_order" ON "media_files" ("order")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_media_files_order"`);
    await queryRunner.query(`DROP INDEX "IDX_media_files_tripId"`);

    // Drop foreign key
    await queryRunner.dropForeignKey('media_files', 'FK_media_files_trip');

    // Drop table
    await queryRunner.dropTable('media_files');
  }
}
