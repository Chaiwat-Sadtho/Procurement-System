import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentNameUniqueIndex1783000000000 implements MigrationInterface {
  name = 'AddDepartmentNameUniqueIndex1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // L3: departments.name เดิมกันชื่อซ้ำที่ service layer อย่างเดียว (findOne ก่อน insert) ซึ่ง race ได้
    // เพิ่ม DB-level unique index ให้กันชื่อแผนกซ้ำแบบ race-safe (คู่กับ 23505 -> 409 ใน service)
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_department_name" ON "departments" ("name")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_department_name"`);
  }
}
