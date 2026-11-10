import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformActionProjection1794390000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE platform_action_projection (
      action_id text PRIMARY KEY REFERENCES s12_action(id),
      shop_id text NOT NULL, channel_id text NOT NULL,
      revision integer NOT NULL CHECK(revision > 0), state text NOT NULL,
      event_id text NOT NULL REFERENCES s12_outbox(id)
    )`);
  }
  async down(q: QueryRunner) { await q.query('DROP TABLE platform_action_projection'); }
}
