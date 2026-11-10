import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { prepareSession, childEnvironment, root, assertPortsFree } from '../../dev/session.mjs';
import { startService, stopService } from '../../dev/processes.mjs';
import { startApi } from './runtime.mjs';
import { seed } from './fixtures.mjs';

const session = await prepareSession('A', undefined, 'S10');
const services = [];
let stopping = false;
let stop;
const requestedStop = new Promise(resolve => { stop = resolve; });
let failure;
function watch(child, role) {
  services.push(child);
  const failed = detail => {
    if (stopping) return;
    failure ??= new Error(`Service S10 ${role} arrêté (${detail}).`);
    stop();
  };
  child.once('exit', (code, signal) => failed(signal ?? code));
  child.once('error', error => failed(error.message));
  if (child.exitCode !== null || child.signalCode !== null) failed(child.signalCode ?? child.exitCode);
  if (failure) throw failure;
  return child;
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => { stopping = true; stop(); });
try {
  await assertPortsFree([session.apiPort, session.postgresPort, session.dashboardPort]);
  const postgres = watch(await startService(session, 'postgres', { detached: true }), 'postgres');
  const server = watch(await startApi(session), 'server');
  const fixtureFile = path.join(session.dataDir, 'fixtures.json');
  try { await access(fixtureFile); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(fixtureFile, JSON.stringify(await seed(session)), { mode: 0o600 });
  }
  const worker = watch(await startApi(session, ['--worker']), 'worker');
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'infra/tests/s10/vite.config.mts'], {
    cwd: root, env: childEnvironment(session), detached: true, stdio: 'inherit',
  });
  watch(vite, 'dashboard');
  console.log(`S10 : http://127.0.0.1:${session.dashboardPort}/dashboard/catalogue-import`);
  process.send?.({ ready: true, services: { postgres: postgres.pid, server: server.pid, worker: worker.pid, dashboard: vite.pid } });
  await requestedStop;
  if (failure) throw failure;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  stopping = true;
  for (const service of services.reverse()) await stopService(service);
}
process.exit(process.exitCode ?? 0);
