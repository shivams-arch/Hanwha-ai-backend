import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGoalMetadata1730476800000 implements MigrationInterface {
  name = 'AddGoalMetadata1730476800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."financial_goals_metricunit_enum" AS ENUM('currency','hours','points','tasks','percent','none')`
    );

    await queryRunner.addColumn(
      'financial_goals',
      new TableColumn({
        name: 'metricUnit',
        type: 'enum',
        enumName: 'financial_goals_metricunit_enum',
        default: `'currency'`,
        isNullable: false,
      })
    );

    await queryRunner.addColumn(
      'financial_goals',
      new TableColumn({
        name: 'metadata',
        type: 'jsonb',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('financial_goals', 'metadata');
    await queryRunner.dropColumn('financial_goals', 'metricUnit');
    await queryRunner.query(`DROP TYPE "public"."financial_goals_metricunit_enum"`);
  }
}

