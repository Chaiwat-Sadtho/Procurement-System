import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentNameUniqueIndex1783000000000 implements MigrationInterface {
  name = 'AddDepartmentNameUniqueIndex1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Race-safe uniqueness for department names; the service's findOne check alone can lose a race
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_department_name" ON "departments" ("name")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_department_name"`);
  }
}
