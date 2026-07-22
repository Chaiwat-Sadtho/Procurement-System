import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivePoPerPrIndex1779700000000 implements MigrationInterface {
  name = 'AddActivePoPerPrIndex1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // At most one active PO (status != cancelled) per PR, enforced in the DB so races cannot slip past
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_active_po_per_pr" ON "purchase_orders" ("pr_id") WHERE status != 'cancelled'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_active_po_per_pr"`);
  }
}
