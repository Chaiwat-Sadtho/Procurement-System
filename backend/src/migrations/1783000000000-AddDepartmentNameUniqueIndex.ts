import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentNameUniqueIndex1783000000000 implements MigrationInterface {
  name = 'AddDepartmentNameUniqueIndex1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // DB-level unique index กันชื่อแผนกซ้ำแบบ race-safe — findOne check ที่ service อย่างเดียว race ได้
    // (คู่กับ 23505 -> 409 ใน service)
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_department_name" ON "departments" ("name")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_department_name"`);
  }
}
