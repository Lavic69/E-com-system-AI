import { bootstrapWorker } from '@vendure/core';
import { config } from './vendure-config';

async function main() {
  const worker = await bootstrapWorker(config);
  worker.app.enableShutdownHooks();
  if (process.send) process.once('disconnect', () => { void worker.app.close().then(() => process.exit(0)); });
  await worker.startJobQueue();
  process.send?.({ ready: true, role: 'worker' });
  console.log('Worker local prêt.');
}
main().catch(() => { console.error('Échec du démarrage worker.'); process.exit(1); });
