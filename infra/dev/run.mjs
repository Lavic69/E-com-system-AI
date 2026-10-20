import { access, open, readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { prepareSession, sessionSlot, sessionMission, root, assertPortsFree, childEnvironment } from './session.mjs';
import { command, startService, stopService } from './processes.mjs';

const session = process.env.ECOM_SESSION_FILE
  ? JSON.parse(await readFile(process.env.ECOM_SESSION_FILE, 'utf8'))
  : await prepareSession(sessionSlot(), root, sessionMission());
const lockPath = path.join(session.dataDir, 'running.lock');
const lock = await open(lockPath, 'wx');
await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
let postgres;
const children = [];
let stopping = false;
async function cleanup() {
  if (stopping) return;
  stopping = true;
  for (const child of children.reverse()) await stopService(child);
  if (postgres) await stopService(postgres);
  await lock.close();
  await unlink(lockPath);
}
let stopRequested;
const stopped = new Promise(resolve => { stopRequested = resolve; });
let serviceFailure;
function watchService(child, role) {
  const failed = detail => {
    if (stopping) return;
    serviceFailure ??= new Error(`Le service ${role} s'est arrêté de façon inattendue (${detail}).`);
    stopRequested();
  };
  child.once('exit', (code, signal) => failed(signal ?? code));
  child.once('error', error => failed(error.message));
  // Une sortie entre le signal de disponibilité et notre abonnement reste visible.
  if (child.exitCode !== null || child.signalCode !== null) {
    failed(child.signalCode ?? child.exitCode);
  }
  return child;
}
function assertServicesRunning() {
  if (serviceFailure) throw serviceFailure;
}
// npm et le terminal peuvent transmettre plusieurs fois la même interruption.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, stopRequested);

try {
  await assertPortsFree([session.apiPort, session.dashboardPort, session.postgresPort]);
  await access(path.join(root, 'apps/commerce/dist/server.js'));
  postgres = watchService(await startService(session, 'postgres', { detached: true }), 'postgres');
  assertServicesRunning();
  if (process.argv.includes('--generate-migration')) {
    await command(process.execPath, ['apps/commerce/dist/migrate.js', '--generate'], { env: childEnvironment(session) });
    assertServicesRunning();
  } else {
    await command(process.execPath, ['apps/commerce/dist/migrate.js'], { env: childEnvironment(session) });
    assertServicesRunning();
    children.push(watchService(await startService(session, 'server', { detached: true }), 'server'));
    assertServicesRunning();
    children.push(watchService(await startService(session, 'worker', { detached: true }), 'worker'));
    assertServicesRunning();
    const dashboard = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--config', 'vite.config.mts'], {
      cwd: path.join(root, 'apps/dashboard'), env: childEnvironment(session), stdio: 'inherit', detached: true,
    });
    children.push(watchService(dashboard, 'dashboard'));
    assertServicesRunning();
    console.log(`Administration : http://127.0.0.1:${session.dashboardPort}/dashboard/`);
    console.log('Ctrl+C arrête les processus de cette session et conserve ses données.');
    process.send?.({
      ready: true, role: 'dev',
      services: { postgres: postgres.pid, server: children[0].pid, worker: children[1].pid, dashboard: dashboard.pid },
    });
    await stopped;
    assertServicesRunning();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
}
process.exit(process.exitCode ?? 0);
