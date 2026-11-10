require('ts-node').register({ project: 'apps/commerce/tsconfig.json', transpileOnly: true });
const { bootstrap, bootstrapWorker, runMigrations, generateMigration } = require('@vendure/core');
const { config } = process.argv.includes('--foundation')
  ? require('../../../apps/commerce/src/foundation-config.ts')
  : require('./vendure-config.ts');
const path = require('node:path');

async function main() {
  if (process.argv.includes('--generate')) {
    await runMigrations(config);
    await generateMigration(config, { name: 'CatalogueS10', outputDir: path.resolve('apps/commerce/src/plugins/catalogue/migrations') });
    return;
  }
  if (process.argv.includes('--worker')) {
    const worker = await bootstrapWorker(config);
    worker.app.enableShutdownHooks();
    if (process.send) process.once('disconnect', () => { void worker.app.close().then(() => process.exit(0)); });
    await worker.startJobQueue();
    process.send?.({ ready: true });
    return;
  }
  await runMigrations(config);
  const app = await bootstrap(config);
  app.enableShutdownHooks();
  if (process.send) process.once('disconnect', () => { void app.close().then(() => process.exit(0)); });
  process.send?.({ ready: true });
}
main().catch(error => { console.error(error.message); process.exit(1); });
