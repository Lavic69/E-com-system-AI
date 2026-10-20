import { bootstrap } from '@vendure/core';
import { config } from './vendure-config';

async function main() {
  const app = await bootstrap(config);
  app.enableShutdownHooks();
  if (process.send) process.once('disconnect', () => { void app.close().then(() => process.exit(0)); });
  process.send?.({ ready: true, role: 'api' });
  console.log(`API locale prête sur 127.0.0.1:${config.apiOptions.port}.`);
}
main().catch(() => { console.error('Échec du démarrage API. Vérifier la session, la base et les migrations.'); process.exit(1); });
