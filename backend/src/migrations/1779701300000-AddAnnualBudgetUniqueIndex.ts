import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnnualBudgetUniqueIndex1779701300000 implements MigrationInterface {
    name = 'AddAnnualBudgetUniqueIndex1779701300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Review #2: the composite UNIQUE(department_id, fiscal_year, quarter) does NOT
        // prevent duplicate annual budgets, because Postgres treats NULL quarters as
        // distinct. A partial unique index covers the quarter IS NULL case so a department
        // can have at most one annual budget per fiscal year (DB-level, race-safe).
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_annual_budget_per_dept_year" ON "budgets" ("department_id", "fiscal_year") WHERE "quarter" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_annual_budget_per_dept_year"`);
    }

}
