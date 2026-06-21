import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncements1782000000000 implements MigrationInterface {
  name = 'CreateAnnouncements1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "announcements" ("id" SERIAL NOT NULL, "title" character varying(100) NOT NULL, "detail" character varying(200) NOT NULL, "icon" character varying(20) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "is_pinned" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_announcements" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "announcements"`);
  }
}
