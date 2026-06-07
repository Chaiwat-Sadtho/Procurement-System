import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivePoPerPrIndex1779700000000 implements MigrationInterface {
  name = 'AddActivePoPerPrIndex1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // P4-2: บังคับระดับ DB ว่า PR หนึ่งใบมี active PO (status != cancelled) ได้ไม่เกิน 1 ใบ — กัน race ที่ app-level check หลุด
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_active_po_per_pr" ON "purchase_orders" ("pr_id") WHERE status != 'cancelled'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_active_po_per_pr"`);
  }
}
