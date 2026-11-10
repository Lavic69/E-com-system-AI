import { MigrationInterface, QueryRunner } from 'typeorm';

/** Candidate migration; G1 owns ordering with S10/S12. */
export class ContentPages1794355200000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "content_page" (
      "id" SERIAL PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      "channelId" integer NOT NULL CONSTRAINT "FK_1192598cdaa292d023f268d8a24" REFERENCES "channel"("id") ON DELETE RESTRICT, "languageCode" varchar NOT NULL,
      "slug" varchar NOT NULL, "title" varchar NOT NULL, "revision" integer NOT NULL DEFAULT 1 CHECK ("revision" > 0),
      "headVersion" integer NOT NULL DEFAULT 1 CHECK ("headVersion" > 0), "selectedVersion" integer,
      "fencingToken" integer NOT NULL DEFAULT 0 CHECK ("fencingToken" >= 0), "leaseHolder" varchar,
      "acquiredAt" timestamptz, "expiresAt" timestamptz,
      UNIQUE ("channelId", "languageCode", "slug")
    )`);
    await runner.query(`CREATE TABLE "content_revision" (
      "id" SERIAL PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      "pageId" integer NOT NULL CONSTRAINT "FK_e132b50f644736fd823579ab421" REFERENCES "content_page"("id") ON DELETE RESTRICT, "version" integer NOT NULL CHECK ("version" > 0),
      "parentVersion" integer, "state" varchar NOT NULL CHECK ("state" IN ('draft','validated')),
      "document" jsonb NOT NULL, "contentDigest" varchar NOT NULL, "themeVersion" varchar NOT NULL,
      "validatedAt" timestamptz, "evidenceRefs" jsonb NOT NULL, "authorId" varchar NOT NULL,
      UNIQUE ("pageId", "version"),
      FOREIGN KEY ("pageId", "parentVersion") REFERENCES "content_revision"("pageId", "version"),
      CHECK (("version" = 1 AND "parentVersion" IS NULL) OR ("version" > 1 AND "parentVersion" IS NOT NULL AND "parentVersion" = "version" - 1)),
      CHECK (("state" = 'draft' AND "validatedAt" IS NULL) OR ("state" = 'validated' AND "validatedAt" IS NOT NULL AND jsonb_array_length("evidenceRefs") > 0))
    )`);
    await runner.query(`ALTER TABLE "content_page" ADD CONSTRAINT "content_selected_version_fk" FOREIGN KEY ("id", "selectedVersion") REFERENCES "content_revision"("pageId", "version")`);
    await runner.query(`CREATE TABLE "content_lease_event" (
      "id" SERIAL PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      "pageId" integer NOT NULL CONSTRAINT "FK_0e894409aec3bb9d26fc17cffba" REFERENCES "content_page"("id") ON DELETE RESTRICT, "kind" varchar NOT NULL,
      "fencingToken" integer NOT NULL, "actorId" varchar NOT NULL
    )`);
    await runner.query(`CREATE FUNCTION content_reject_version_change() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'Content versions and lease events are immutable'; END; $$ LANGUAGE plpgsql`);
    await runner.query(`CREATE TRIGGER content_revision_immutable BEFORE UPDATE OR DELETE ON "content_revision" FOR EACH ROW EXECUTE FUNCTION content_reject_version_change()`);
    await runner.query(`CREATE TRIGGER content_lease_event_immutable BEFORE UPDATE OR DELETE ON "content_lease_event" FOR EACH ROW EXECUTE FUNCTION content_reject_version_change()`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE "content_page" DROP CONSTRAINT "content_selected_version_fk"');
    await runner.query('DROP TABLE "content_lease_event", "content_revision", "content_page"');
    await runner.query('DROP FUNCTION content_reject_version_change()');
  }
}
