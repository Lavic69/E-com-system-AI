import { readFile } from 'node:fs/promises';
import { startPostgres } from './postgres.mjs';

const session = JSON.parse(await readFile(process.env.ECOM_SESSION_FILE, 'utf8'));
const postgres = await startPostgres(session);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await postgres.stop();
  process.exit(0);
}
process.on('message', message => { if (message === 'shutdown') void stop(); });
process.once('disconnect', () => void stop());
process.send?.({ ready: true, role: 'postgres' });
