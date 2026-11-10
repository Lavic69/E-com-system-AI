require('reflect-metadata');
require('ts-node').register({ project: 'apps/commerce/tsconfig.json', transpileOnly: true });
const { bootstrap, runMigrations, TransactionalConnection } = require('@vendure/core');
const recipe = require('./vendure-config.ts');
const baseOnly = process.env.S11_BASE_ONLY === 'true';
const config = baseOnly ? require('../../../apps/commerce/src/foundation-config.ts').config : recipe.config;

async function main() {
  await runMigrations(config);
  const app = await bootstrap(config);
  const connection = app.get(TransactionalConnection);
  if (!baseOnly) {
    await connection.rawConnection.query('CREATE TABLE IF NOT EXISTS s11_fixture_protection (page_id integer PRIMARY KEY, active boolean NOT NULL)');
    recipe.bindFixtureConnection(connection);
  }
  app.enableShutdownHooks();
  process.once('disconnect', () => void app.close().then(() => process.exit(0)));
  process.send?.({ ready: true });
}
main().catch(error => { console.error(error.message); process.exit(1); });
