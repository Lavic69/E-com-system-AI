import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepareSession, sessionSlot, sessionMission } from './session.mjs';

test('A et B ont des ressources et secrets distincts, stables au redémarrage', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ecom-session-test-'));
  const a = await prepareSession('A', directory);
  const b = await prepareSession('B', directory);
  for (const property of ['database', 'postgresDir', 'mediaDir', 'apiPort', 'dashboardPort', 'postgresPort', 'databasePassword', 'adminPassword', 'cookieSecret']) {
    assert.notEqual(a[property], b[property], property);
  }
  assert.deepEqual(await prepareSession('A', directory), a);
  assert.equal((await stat(a.file)).mode & 0o777, 0o600);
  assert.equal(JSON.parse(await readFile(a.file, 'utf8')).id, 'v0-s00-a');
});

test('un nom de session invalide est refusé', () => {
  assert.throws(() => sessionSlot(['--session=../../elsewhere']), /Session attendue/);
  assert.throws(() => sessionSlot(['--session=constructor']), /Session attendue/);
  assert.equal(sessionSlot([]), 'A');
});

test('une mission V1 prépare ses propres données sans reprendre les secrets de S00', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ecom-wave-test-'));
  const s00 = await prepareSession('A', directory);
  const s10 = await prepareSession('A', directory, 'S10');
  assert.equal(s10.id, 'v1-s10-a');
  assert.notEqual(s10.database, s00.database);
  assert.notEqual(s10.mediaDir, s00.mediaDir);
  assert.notEqual(s10.adminPassword, s00.adminPassword);
  assert.deepEqual(await prepareSession('A', directory, 'S10'), s10);
  const s11 = await prepareSession('B', directory, 'S11');
  const s12 = await prepareSession('C', directory, 'S12');
  assert.equal(new Set([s10.postgresPort, s11.postgresPort, s12.postgresPort]).size, 3);
});

test('seules les missions préparées sont acceptées', () => {
  assert.equal(sessionMission([]), 'S00');
  assert.equal(sessionMission(['--mission=S11']), 'S11');
  assert.throws(() => sessionMission(['--mission=S99']), /Mission attendue/);
  assert.throws(() => sessionMission(['--mission=constructor']), /Mission attendue/);
});
