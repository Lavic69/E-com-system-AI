const { bootstrap, bootstrapWorker, runMigrations, TransactionalConnection, Channel } = require('@vendure/core');
const { OperationsService } = require('../../../apps/commerce/dist/plugins/operations/operations.service');
const { config, options } = require('./config.cjs');

async function main() {
  if (process.argv.includes('--migrate')) {
    await runMigrations(config);
    return;
  }
  const worker = process.argv.includes('--execute') || process.argv.includes('--deliver');
  const app = worker ? (await bootstrapWorker(config)).app : await bootstrap(config);
  const connection = app.get(TransactionalConnection);
  options.runtimeConnection = connection;
  const channels = await connection.rawConnection.getRepository(Channel).find();
  for (const channel of channels)
    options.markets[String(channel.id)] = {
      marketId: `market-s12-${channel.id}`,
      languages: channel.availableLanguageCodes,
      currencies: channel.availableCurrencyCodes.filter((c) => ['EUR', 'USD'].includes(c)),
    };
  const operations = app.get(OperationsService);
  if (process.argv.includes('--execute')) {
    await operations.execute(process.env.S12_ACTION_ID);
    await app.close();
    return;
  }
  if (process.argv.includes('--deliver')) {
    await operations.deliverOne(async (event) => {
      // Durable receipt lets the parent kill this worker before acknowledgement.
      await connection.rawConnection.query(
        'INSERT INTO s12_fixture_delivery(event_id) VALUES($1) ON CONFLICT DO NOTHING',
        [event.eventId],
      );
      process.send?.({ delivered: event.eventId });
      await new Promise(() => {});
    });
    return;
  }
  process.send?.({ ready: true });
  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
