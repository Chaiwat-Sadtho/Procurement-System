import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnualBudgetUniqueIndex1779701300000 implements MigrationInterface {
  name = 'AddAnnualBudgetUniqueIndex1779701300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres treats NULL quarters as distinct, so UNIQUE(department_id, fiscal_year, quarter) still
    // allows duplicate annual budgets. This partial index caps them at one per department and year.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_annual_budget_per_dept_year" ON "budgets" ("department_id", "fiscal_year") WHERE "quarter" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_annual_budget_per_dept_year"`);
  }
}
