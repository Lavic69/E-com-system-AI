require('reflect-metadata');
const { bootstrap, runMigrations } = require('@vendure/core');
const { config } = require('../../../apps/commerce/dist/vendure-config');
(async () => {
  await runMigrations(config);
  const app = await bootstrap(config);
  app.enableShutdownHooks();
  process.once('disconnect', () => void app.close().then(() => process.exit(0)));
  process.send?.({ ready: true });
})().catch(error => { console.error(error.message); process.exit(1); });
