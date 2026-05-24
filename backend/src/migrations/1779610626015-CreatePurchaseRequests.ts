import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseRequests1779610626015 implements MigrationInterface {
    name = 'CreatePurchaseRequests1779610626015'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."purchase_requests_status_enum" AS ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "purchase_requests" ("id" SERIAL NOT NULL, "pr_number" character varying(20) NOT NULL, "requester_id" integer NOT NULL, "department_id" integer, "title" character varying(255) NOT NULL, "status" "public"."purchase_requests_status_enum" NOT NULL DEFAULT 'draft', "required_date" date NOT NULL, "quarter" integer, "total_estimated_amount" numeric(15,2) NOT NULL DEFAULT '0', "approved_by" integer, "approved_at" TIMESTAMP, "fiscal_year" integer, "reject_reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_21be55b2269e6e35faf8373da0f" UNIQUE ("pr_number"), CONSTRAINT "PK_f3c5a8ff7bd4338f4c860925c8f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "purchase_request_items" ("id" SERIAL NOT NULL, "pr_id" integer NOT NULL, "item_name" character varying(255) NOT NULL, "description" text, "quantity" numeric(10,2) NOT NULL, "unit" character varying(50) NOT NULL, "estimated_unit_price" numeric(15,2) NOT NULL, "estimated_total_price" numeric(15,2) NOT NULL, CONSTRAINT "PK_beecbb6cca527e5c67903520e1e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "purchase_requests" ADD CONSTRAINT "FK_f4a79f7b7ce5945c1c2f7e07174" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_requests" ADD CONSTRAINT "FK_3ee8e94c75dcdbe9029954d0f87" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_requests" ADD CONSTRAINT "FK_d2d3ea230bfbfe8a9b29308e792" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_request_items" ADD CONSTRAINT "FK_a2f1ef7a55f51ace7fa8ab027db" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchase_request_items" DROP CONSTRAINT "FK_a2f1ef7a55f51ace7fa8ab027db"`);
        await queryRunner.query(`ALTER TABLE "purchase_requests" DROP CONSTRAINT "FK_d2d3ea230bfbfe8a9b29308e792"`);
        await queryRunner.query(`ALTER TABLE "purchase_requests" DROP CONSTRAINT "FK_3ee8e94c75dcdbe9029954d0f87"`);
        await queryRunner.query(`ALTER TABLE "purchase_requests" DROP CONSTRAINT "FK_f4a79f7b7ce5945c1c2f7e07174"`);
        await queryRunner.query(`DROP TABLE "purchase_request_items"`);
        await queryRunner.query(`DROP TABLE "purchase_requests"`);
        await queryRunner.query(`DROP TYPE "public"."purchase_requests_status_enum"`);
    }

}
