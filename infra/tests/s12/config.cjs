require('reflect-metadata');
const path = require('node:path');
const { config: base } = require('../../../apps/commerce/dist/foundation-config');
const { OperationsPlugin } = require('../../../apps/commerce/dist/plugins/operations/operations.plugin');
const {
  Operations1792513200000,
} = require('../../../apps/commerce/dist/plugins/operations/migrations/1792513200000-Operations');
const { LocalMailTransport } = require('../../../apps/commerce/dist/plugins/operations/local-mail');
const { refuse } = require('../../../apps/commerce/dist/plugins/operations/contracts');

const options = {
  shopId: 's12-local-test',
  policyVersion: 's12-policy-1',
  markets: {},
  leaseMs: Number(process.env.S12_LEASE_MS ?? 200),
  transports: { 'local-mail': new LocalMailTransport(process.env.S12_RECEIVER ?? 'http://127.0.0.1:1', 1000) },
  adapters: ['transactional', 'external'].map((mode) => ({
    kind: 's12-fixture',
    capability: mode === 'transactional' ? 'fixture.update' : 'email.test',
    permission: 'ApplyOperations',
    mode,
    async prepare(manager, ctx, context, intent) {
      const { User } = require('@vendure/core');
      if (!ctx.activeUserId || options.runtimeConnection.getRepository(ctx, User).manager !== manager)
        refuse('TRANSACTION_CONTEXT_LOST');
      const [target] = await manager.query(
        'SELECT * FROM s12_fixture_target WHERE id=$1 AND channel_id=$2 FOR UPDATE',
        [intent.target.id, context.scope.channelId],
      );
      if (!target) refuse('TARGET_NOT_FOUND');
      if (String(target.version) !== intent.target.version) refuse('TARGET_VERSION_CHANGED');
      if (intent.payload.forceRollback) {
        await manager.query('UPDATE s12_fixture_target SET body=$2 WHERE id=$1', [target.id, 'must rollback']);
        refuse('EDIT_RESERVED');
      }
    },
    async apply(manager, ctx, context, intent) {
      await manager.query('UPDATE s12_fixture_target SET version=version+1,body=$2 WHERE id=$1', [
        intent.target.id,
        intent.payload.body ?? 'applied',
      ]);
      await manager.query('INSERT INTO s12_fixture_effect(action_key) VALUES($1)', [intent.effectKey]);
      if (intent.payload.crashTransaction) throw new Error('TEST_TRANSACTION_ABORT');
      return `fixture:target:${intent.target.id}:${Number(intent.target.version) + 1}`;
    },
  })),
};
const config = {
  ...base,
  plugins: [...base.plugins, OperationsPlugin.init(options)],
  dbConnectionOptions: {
    ...base.dbConnectionOptions,
    migrations: [...base.dbConnectionOptions.migrations, Operations1792513200000],
  },
};
module.exports = { config, options };
