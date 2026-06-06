import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseOrders1779623673898 implements MigrationInterface {
  name = 'CreatePurchaseOrders1779623673898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "purchase_order_items" ("id" SERIAL NOT NULL, "po_id" integer NOT NULL, "pr_item_id" integer, "item_name" character varying(255) NOT NULL, "quantity" numeric(10,2) NOT NULL, "unit" character varying(50) NOT NULL, "unit_price" numeric(15,2) NOT NULL, "total_price" numeric(15,2) NOT NULL, "received_quantity" numeric(10,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_e8b7568d25c41e3290db596b312" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."purchase_orders_status_enum" AS ENUM('draft', 'sent', 'acknowledged', 'partially_received', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "purchase_orders" ("id" SERIAL NOT NULL, "po_number" character varying(20) NOT NULL, "pr_id" integer NOT NULL, "vendor_id" integer NOT NULL, "created_by" integer NOT NULL, "status" "public"."purchase_orders_status_enum" NOT NULL DEFAULT 'draft', "total_amount" numeric(15,2) NOT NULL DEFAULT '0', "expected_delivery_date" date NOT NULL, "actual_delivery_date" date, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_74065a5d2b8c4c14b8b8fcf0159" UNIQUE ("po_number"), CONSTRAINT "PK_05148947415204a897e8beb2553" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."goods_receipt_notes_status_enum" AS ENUM('partial', 'complete')`,
    );
    await queryRunner.query(
      `CREATE TABLE "goods_receipt_notes" ("id" SERIAL NOT NULL, "grn_number" character varying(20) NOT NULL, "po_id" integer NOT NULL, "received_by" integer NOT NULL, "received_date" date NOT NULL, "status" "public"."goods_receipt_notes_status_enum" NOT NULL, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fcaf6e658610326f536de2faaf3" UNIQUE ("grn_number"), CONSTRAINT "PK_1cec586a0a55f192ee26bc5c3ec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."goods_receipt_items_condition_enum" AS ENUM('good', 'damaged')`,
    );
    await queryRunner.query(
      `CREATE TABLE "goods_receipt_items" ("id" SERIAL NOT NULL, "grn_id" integer NOT NULL, "po_item_id" integer NOT NULL, "received_quantity" numeric(10,2) NOT NULL, "condition" "public"."goods_receipt_items_condition_enum" NOT NULL, CONSTRAINT "PK_3773489ac01faa49777eed0a14f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "vendor_ratings" ("id" SERIAL NOT NULL, "vendor_id" integer NOT NULL, "po_id" integer NOT NULL, "score" integer NOT NULL, "comment" text, "rated_by" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_vendor_rating_po" UNIQUE ("po_id"), CONSTRAINT "PK_d4b5c309bea14f7623e89651ea5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_a6404cc1ff12740ea768e6ea9c2" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_dd0309154c43c77b7cb650c9d17" FOREIGN KEY ("pr_item_id") REFERENCES "purchase_request_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_96840bf9232e743b77e926cc7f0" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_346ae76b48e8f5042cf93b8df26" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_99f44faa1ca8d7ec9ebef918b06" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "FK_fc612515e5c3b6ee22a5ce93316" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "FK_0f61d6687bc5b2de0a154c48121" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "FK_ad92f388ee9f874aff80f5efcab" FOREIGN KEY ("grn_id") REFERENCES "goods_receipt_notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "FK_929daa02a2dd91b2a8fc9f60e8e" FOREIGN KEY ("po_item_id") REFERENCES "purchase_order_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_ratings" ADD CONSTRAINT "FK_4cb35f8faf0f8dad75ee457be16" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vendor_ratings" DROP CONSTRAINT "FK_4cb35f8faf0f8dad75ee457be16"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_items" DROP CONSTRAINT "FK_929daa02a2dd91b2a8fc9f60e8e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_items" DROP CONSTRAINT "FK_ad92f388ee9f874aff80f5efcab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_notes" DROP CONSTRAINT "FK_0f61d6687bc5b2de0a154c48121"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_notes" DROP CONSTRAINT "FK_fc612515e5c3b6ee22a5ce93316"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_99f44faa1ca8d7ec9ebef918b06"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_346ae76b48e8f5042cf93b8df26"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_96840bf9232e743b77e926cc7f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_dd0309154c43c77b7cb650c9d17"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_a6404cc1ff12740ea768e6ea9c2"`,
    );
    await queryRunner.query(`DROP TABLE "vendor_ratings"`);
    await queryRunner.query(`DROP TABLE "goods_receipt_items"`);
    await queryRunner.query(`DROP TYPE "public"."goods_receipt_items_condition_enum"`);
    await queryRunner.query(`DROP TABLE "goods_receipt_notes"`);
    await queryRunner.query(`DROP TYPE "public"."goods_receipt_notes_status_enum"`);
    await queryRunner.query(`DROP TABLE "purchase_orders"`);
    await queryRunner.query(`DROP TYPE "public"."purchase_orders_status_enum"`);
    await queryRunner.query(`DROP TABLE "purchase_order_items"`);
  }
}
