import {MigrationInterface, QueryRunner} from "typeorm";

export class CatalogueS101794309752560 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "catalogue_import_receipt" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "channelId" character varying(64) NOT NULL, "rowKey" character varying(100) NOT NULL, "fingerprint" character varying(64) NOT NULL, "productId" character varying(64) NOT NULL, "variantId" character varying(64) NOT NULL, "id" SERIAL NOT NULL, CONSTRAINT "PK_c74d46f7eb89287b044d42d06ee" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_catalogue_import_channel_key" ON "catalogue_import_receipt" ("channelId", "rowKey") `, undefined);
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsPreferredlanguage" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsContactpreference" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsContactpreference"`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsPreferredlanguage"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."UQ_catalogue_import_channel_key"`, undefined);
        await queryRunner.query(`DROP TABLE "catalogue_import_receipt"`, undefined);
   }

}
