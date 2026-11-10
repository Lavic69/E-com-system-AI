import { MigrationInterface, QueryRunner } from 'typeorm';

export class Operations1792513200000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE s12_action (
        id text PRIMARY KEY, shop_id text NOT NULL, channel_id text NOT NULL,
        document jsonb NOT NULL, intent jsonb NOT NULL, binding jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CHECK(document->>'id'=id),
        CHECK(document->'context'->'scope'->>'shopId'=shop_id),
        CHECK(document->'context'->'scope'->>'channelId'=channel_id)
      );
      CREATE INDEX s12_action_channel ON s12_action(shop_id, channel_id, created_at);
      CREATE TABLE s12_operation (
        id text PRIMARY KEY, action_id text NOT NULL UNIQUE REFERENCES s12_action(id),
        shop_id text NOT NULL, effect_key text NOT NULL, document jsonb NOT NULL,
        lease_token text, lease_until timestamptz, dispatched_at timestamptz, receipt jsonb,
        UNIQUE(shop_id, effect_key), CHECK(document->>'operationId'=id)
      );
      CREATE UNIQUE INDEX s12_idempotency_key ON s12_operation((document->>'idempotencyKey'));
      CREATE TABLE s12_approval (
        id text PRIMARY KEY, action_id text NOT NULL REFERENCES s12_action(id),
        document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE s12_connection (
        id text PRIMARY KEY, shop_id text NOT NULL, channel_id text NOT NULL, document jsonb NOT NULL
      );
      CREATE TABLE s12_delegation (
        id text PRIMARY KEY, shop_id text NOT NULL, channel_id text NOT NULL,
        user_id text NOT NULL, agent_id text NOT NULL, capabilities jsonb NOT NULL,
        policy_version text NOT NULL, ceiling integer NOT NULL CHECK(ceiling >= 0), currency text NOT NULL,
        expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false
      );
      CREATE TABLE s12_agent (
        user_id text PRIMARY KEY, shop_id text NOT NULL, agent_id text NOT NULL UNIQUE
      );
      CREATE TABLE s12_budget (
        id text PRIMARY KEY, shop_id text NOT NULL, channel_id text NOT NULL,
        currency text NOT NULL CHECK(currency IN ('EUR', 'USD')),
        ceiling integer NOT NULL CHECK(ceiling >= 0), blocked boolean NOT NULL DEFAULT false
      );
      CREATE TABLE s12_budget_period (
        budget_id text NOT NULL REFERENCES s12_budget(id), period_start timestamptz NOT NULL,
        period_end timestamptz NOT NULL, known bigint NOT NULL DEFAULT 0 CHECK(known >= 0),
        PRIMARY KEY(budget_id, period_start), CHECK(period_end > period_start)
      );
      CREATE TABLE s12_reservation (
        id text PRIMARY KEY, operation_id text NOT NULL UNIQUE REFERENCES s12_operation(id),
        budget_id text NOT NULL REFERENCES s12_budget(id), document jsonb NOT NULL,
        held integer NOT NULL CHECK(held >= 0)
      );
      CREATE TABLE s12_outbox (
        id text PRIMARY KEY, document jsonb NOT NULL, digest text NOT NULL,
        delivered_at timestamptz, lease_token text, lease_until timestamptz,
        attempts integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE s12_inbox (
        consumer_id text NOT NULL, source_key text NOT NULL, digest text NOT NULL,
        status text NOT NULL, document jsonb NOT NULL, PRIMARY KEY(consumer_id, source_key)
      );
      CREATE TABLE s12_reception (
        id bigserial PRIMARY KEY, consumer_id text NOT NULL, source_key text NOT NULL,
        digest text NOT NULL, status text NOT NULL, received_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE s12_cursor (
        consumer_id text NOT NULL, aggregate_key text NOT NULL, sequence integer NOT NULL DEFAULT 0,
        PRIMARY KEY(consumer_id, aggregate_key)
      );
    `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE s12_cursor, s12_reception, s12_inbox, s12_outbox,
      s12_reservation, s12_budget_period, s12_budget, s12_delegation, s12_agent, s12_connection,
      s12_approval, s12_operation, s12_action`);
  }
}
