import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsers1779586783143 implements MigrationInterface {
    name = 'CreateUsers1779586783143'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('employee', 'manager', 'procurement_officer')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "department_id" integer, "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "first_name" character varying, "middle_name" character varying, "last_name" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'employee', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_0921d1972cf861d568f5271cd85" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_0921d1972cf861d568f5271cd85"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
