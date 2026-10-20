import { fork, spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { root, childEnvironment } from './session.mjs';

export function command(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Commande ${path.basename(command)} terminée avec le code ${code}.`)));
  });
}

export async function startService(session, role, { detached = false } = {}) {
  const filename = role === 'postgres' ? 'infra/dev/postgres-service.mjs' : `apps/commerce/dist/${role}.js`;
  const child = fork(path.join(root, filename), [], {
    cwd: root, env: childEnvironment(session), detached,
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  child.s00Role = role;
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${role} ne démarre pas sous 60 secondes.`)), 60_000);
      const cleanup = () => { clearTimeout(timer); child.off('exit', exited); child.off('error', failed); child.off('message', ready); };
      const exited = code => { cleanup(); reject(new Error(`${role} arrêté avant disponibilité (${code}).`)); };
      const failed = error => { cleanup(); reject(error); };
      const ready = message => { if (message.ready) { cleanup(); resolve(); } };
      child.once('exit', exited);
      child.once('error', failed);
      child.on('message', ready);
    });
    return child;
  } catch (error) { await stopService(child); throw error; }
}

export async function stopService(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  if (child.s00Role === 'postgres' && child.connected) child.send('shutdown');
  else child.kill('SIGTERM');
  // Ne vise que le processus créé par cette commande.
  const timer = setTimeout(() => child.kill('SIGKILL'), 15_000);
  try { await exited; } finally { clearTimeout(timer); }
}
