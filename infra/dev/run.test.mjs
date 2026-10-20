import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('./run.mjs', import.meta.url), 'utf8');

// Exécute le vrai lanceur avec des processus contrôlés, sans serveur ni base.
async function launch(scenario) {
  const process = new EventEmitter();
  Object.assign(process, { env: {}, argv: [], execPath: '/test/node' });
  const session = { dataDir: '/test/data', apiPort: 4101, dashboardPort: 5101, postgresPort: 5541 };
  const children = new Map();
  const stopped = [];
  let exitCode, lockRemoved = false;
  function child(role) {
    const value = new EventEmitter();
    Object.assign(value, { exitCode: null, signalCode: null });
    children.set(role, value);
    return value;
  }
  function exit(role, code = 1) {
    const value = children.get(role);
    value.exitCode = code;
    value.emit('exit', code, null);
  }
  process.exit = code => { exitCode = code; };
  process.send = () => queueMicrotask(() => {
    if (scenario === 'postgres') exit('postgres');
    if (scenario === 'clean-service-exit') exit('server', 0);
    if (scenario === 'signal') {
      process.emit('SIGTERM');
      process.emit('SIGTERM');
    }
  });
  const context = vm.createContext({ process, console: { log() {}, error() {} } });
  const dependencies = {
    'node:fs/promises': {
      access: async () => {},
      open: async () => ({ writeFile: async () => {}, close: async () => {} }),
      readFile: async () => '',
      unlink: async () => { lockRemoved = true; },
    },
    'node:child_process': { spawn: () => child('dashboard') },
    'node:events': { once },
    'node:path': { default: path },
    './session.mjs': {
      prepareSession: async () => session, sessionSlot: () => 'A', sessionMission: () => 'S00', root: '/test',
      assertPortsFree: async () => {}, childEnvironment: () => ({}),
    },
    './processes.mjs': {
      command: async () => {},
      startService: async (_session, role) => {
        if (role === 'worker' && scenario === 'early-api') exit('server');
        const value = child(role);
        // Le processus peut aussi sortir juste avant le retour de startService.
        if (role === 'server' && scenario === 'already-exited') exit('server');
        return value;
      },
      stopService: async value => {
        stopped.push([...children].find(([, c]) => c === value)[0]);
        if (value.exitCode === null) {
          value.exitCode = 0;
          value.emit('exit', 0, null);
        }
      },
    },
  };
  const module = new vm.SourceTextModule(source, { context });
  await module.link(async name => {
    const exports = dependencies[name];
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  const execution = module.evaluate();
  const completed = await Promise.race([execution.then(() => true), delay(100).then(() => false)]);
  if (!completed) {
    process.emit('SIGTERM');
    await execution;
  }
  return { completed, exitCode, lockRemoved, stopped, children: [...children.keys()] };
}

for (const [scenario, name] of [
  ['early-api', 'API arrêtée pendant le démarrage du worker'],
  ['already-exited', 'service déjà arrêté au retour de sa disponibilité'],
  ['postgres', 'PostgreSQL arrêté après le démarrage'],
  ['clean-service-exit', 'sortie inattendue même avec un code zéro'],
]) {
  test(`${name} : échec du lanceur et nettoyage sans intervention`, async () => {
    const result = await launch(scenario);
    assert.equal(result.completed, true, 'La panne doit arrêter le lanceur sans signal manuel.');
    assert.equal(result.exitCode, 1);
    assert.equal(result.lockRemoved, true);
    assert.deepEqual(result.stopped, [...result.children].reverse());
  });
}

test('arrêt demandé deux fois : succès et nettoyage unique, PostgreSQL en dernier', async () => {
  const result = await launch('signal');
  assert.equal(result.completed, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.lockRemoved, true);
  assert.deepEqual(result.stopped, ['dashboard', 'worker', 'server', 'postgres']);
});
