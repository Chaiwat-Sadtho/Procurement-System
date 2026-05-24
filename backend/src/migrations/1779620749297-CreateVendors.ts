import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVendors1779620749297 implements MigrationInterface {
    name = 'CreateVendors1779620749297'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "vendor_categories" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, CONSTRAINT "UQ_f687c57c6b0d0bb9e4fccda1c4d" UNIQUE ("name"), CONSTRAINT "PK_fccd387a978fa4c884eac41aff4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vendors" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "tax_id" character varying(20), "email" character varying(255), "phone" character varying(20), "address" text, "is_blacklisted" boolean NOT NULL DEFAULT false, "blacklist_reason" text, "rating_avg" numeric(3,2), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b42df2ca02bf45e7926867b58e2" UNIQUE ("tax_id"), CONSTRAINT "PK_9c956c9797edfae5c6ddacc4e6e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vendor_category_mappings" ("vendor_id" integer NOT NULL, "category_id" integer NOT NULL, CONSTRAINT "PK_0eec0c037b1e91846598b497eac" PRIMARY KEY ("vendor_id", "category_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6131d99373a6663705d4cd03c9" ON "vendor_category_mappings"  ("vendor_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2abd385a188d13f0b2794befd7" ON "vendor_category_mappings"  ("category_id") `);
        await queryRunner.query(`ALTER TABLE "vendor_category_mappings" ADD CONSTRAINT "FK_6131d99373a6663705d4cd03c94" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "vendor_category_mappings" ADD CONSTRAINT "FK_2abd385a188d13f0b2794befd75" FOREIGN KEY ("category_id") REFERENCES "vendor_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vendor_category_mappings" DROP CONSTRAINT "FK_2abd385a188d13f0b2794befd75"`);
        await queryRunner.query(`ALTER TABLE "vendor_category_mappings" DROP CONSTRAINT "FK_6131d99373a6663705d4cd03c94"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2abd385a188d13f0b2794befd7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6131d99373a6663705d4cd03c9"`);
        await queryRunner.query(`DROP TABLE "vendor_category_mappings"`);
        await queryRunner.query(`DROP TABLE "vendors"`);
        await queryRunner.query(`DROP TABLE "vendor_categories"`);
    }

}
