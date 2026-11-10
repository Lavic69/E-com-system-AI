import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, access } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { prepareSession, assertPortsFree } from '../../dev/session.mjs';

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test('Lanceur S12 : SIGTERM et SIGINT ferment les services avant PostgreSQL', { timeout: 90000 }, async () => {
  const directory = await mkdtemp(path.join(process.cwd(), '.data/s12-launcher-'));
  const session = await prepareSession('C', directory, 'S12');
  session.apiPort = await freePort();
  session.dashboardPort = await freePort();
  session.postgresPort = await freePort();
  await writeFile(session.file, JSON.stringify(session), { mode: 0o600 });
  for (const signal of ['SIGTERM', 'SIGINT']) {
    const child = fork('infra/tests/s12/dev.mjs', [], {
      env: { ...process.env, ECOM_SESSION_FILE: session.file },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    try {
      const ready = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(output)), 45000);
        child.on('message', (m) => {
          if (m.ready) {
            clearTimeout(timeout);
            resolve(m);
          }
        });
        child.once('exit', () => {
          clearTimeout(timeout);
          reject(new Error(output));
        });
      });
      let listening = false;
      for (let attempt = 0; attempt < 150 && !listening; attempt++) {
        try {
          listening = (
            await fetch(`http://127.0.0.1:${session.dashboardPort}/dashboard/`, { signal: AbortSignal.timeout(1000) })
          ).ok;
        } catch {}
        if (!listening) await delay(100);
      }
      assert.ok(listening, 'Dashboard did not start');
      const exited = once(child, 'exit');
      child.kill(signal);
      const [code, exitSignal] = await exited;
      assert.equal(code, 0, output);
      assert.equal(exitSignal, null);
      assert.doesNotMatch(output, /terminating connection|Unhandled 'error'/);
      await assertPortsFree([session.apiPort, session.dashboardPort, session.postgresPort, ready.receiverPort]);
      await assert.rejects(() => access(path.join(session.postgresDir, 'postmaster.pid')));
    } finally {
      if (child.exitCode === null && !child.signalCode) {
        const exited = once(child, 'exit');
        child.kill('SIGTERM');
        await exited;
      }
    }
  }
});
