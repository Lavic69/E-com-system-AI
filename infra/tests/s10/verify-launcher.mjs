import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { assertPortsFree } from '../../dev/session.mjs';
import { stopService } from '../../dev/processes.mjs';

const report = { checkedAt: new Date().toISOString(), status: 'running', cases: [] };
try {
  for (const failure of [false, true]) {
    const child = fork('infra/tests/s10/dev.mjs', [], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
    let services;
    const exited = once(child, 'exit');
    const timer = setTimeout(() => child.kill('SIGTERM'), 90000);
    try {
      const ready = await Promise.race([once(child, 'message').then(([value]) => value), exited.then(([code]) => { throw new Error(`Lanceur arrêté trop tôt (${code}).`); })]);
      assert.equal(ready.ready, true); services = ready.services;
      const deadline = Date.now() + 45000;
      let available = false;
      while (Date.now() < deadline) {
        try { available = (await fetch('http://127.0.0.1:5101/dashboard/', { signal: AbortSignal.timeout(1000) })).ok; } catch {}
        if (available) break;
        await delay(200);
      }
      assert.equal(available, true);
      if (failure) process.kill(services.server, 'SIGTERM');
      else { child.kill('SIGTERM'); await delay(30); if (child.exitCode === null) child.kill('SIGTERM'); }
      const [code] = await exited;
      assert.equal(code, failure ? 1 : 0);
      await assertPortsFree([4101, 5101, 5541]);
      for (const pid of Object.values(services)) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
      await assert.rejects(() => access('.data/v1-s10-a/postgres/postmaster.pid'), { code: 'ENOENT' });
      report.cases.push({ name: failure ? 'Perte réelle de l’API : échec et nettoyage' : 'SIGTERM répété : sortie zéro et nettoyage', status: 'passed' });
    } finally {
      clearTimeout(timer); await stopService(child);
      // Only the child PIDs reported by this test launcher may be cleaned up here.
      for (const pid of Object.values(services ?? {})) { try { process.kill(pid, 'SIGTERM'); } catch {} }
    }
  }
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.message; console.error(error.message); }
report.sourceSha256 = {};
for (const file of ['infra/tests/s10/dev.mjs', 'infra/tests/s10/runtime.mjs', 'infra/tests/s10/server.cjs', 'infra/tests/s10/verify-launcher.mjs']) {
  report.sourceSha256[file] = createHash('sha256').update(await readFile(file)).digest('hex');
}
await writeFile('docs/livraisons/S10/preuves/launcher.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Lanceur S10 : ${report.status}, ${report.cases.length}/2 contrôles.`);
process.exit(report.status === 'passed' ? 0 : 1);
