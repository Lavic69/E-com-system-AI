import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { prepareSession, root, childEnvironment, assertPortsFree } from './session.mjs';
import { databaseClient, startPostgres } from './postgres.mjs';
import { command, startService, stopService } from './processes.mjs';
import { backupSession, restoreSession } from './backup.mjs';
import { clientFor, createReader } from './graphql.mjs';

const reportDir = path.resolve(root, process.env.ECOM_VERIFY_REPORT_DIR ?? 'docs/livraisons/S00/preuves');
await mkdir(reportDir, { recursive: true });
await mkdir(path.join(root, '.data'), { recursive: true, mode: 0o700 });
const directory = await mkdtemp(path.join(root, '.data/verification-'));
const report = { startedAt: new Date().toISOString(), node: process.version, vendure: '3.8.0', cases: [], status: 'running' };
const services = [];
const databases = [];
const secrets = [];
const sanitize = value => secrets.reduce((text, secret) => text.replaceAll(secret, '[REDACTED]'), String(value));

async function check(name, action) {
  const item = { name, status: 'running' };
  report.cases.push(item);
  try { await action(); item.status = 'passed'; console.log(`✓ ${name}`); }
  catch (error) { item.status = 'failed'; item.error = sanitize(error.message); throw error; }
}
async function sourceHashes() {
  const hashes = {};
  for (const folder of ['apps/commerce/src', 'apps/dashboard/src', 'infra/dev']) {
    for (const entry of await readdir(path.join(root, folder), { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const filename = path.join(entry.parentPath, entry.name);
      hashes[path.relative(root, filename)] = createHash('sha256').update(await readFile(filename)).digest('hex');
    }
  }
  for (const filename of ['package.json', 'package-lock.json', 'apps/commerce/tsconfig.json', 'apps/dashboard/tsconfig.json', 'apps/dashboard/vite.config.mts']) {
    hashes[filename] = createHash('sha256').update(await readFile(path.join(root, filename))).digest('hex');
  }
  return hashes;
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function createSession(slot) {
  const session = await prepareSession(slot, directory);
  session.id = `s00-test-${path.basename(directory).toLowerCase()}-${slot.toLowerCase()}`;
  session.apiPort = await freePort();
  session.dashboardPort = await freePort();
  session.postgresPort = await freePort();
  secrets.push(session.databasePassword, session.adminPassword, session.cookieSecret);
  await writeFile(session.file, JSON.stringify(session), { mode: 0o600 });
  return session;
}
async function sql(session, query) {
  const client = databaseClient(session);
  await client.connect();
  try { return await client.query(query); } finally { await client.end(); }
}
async function dbStart(session) {
  const db = await startPostgres(session);
  databases.push(db);
  return db;
}
async function dbStop(db) {
  await db.stop();
  databases.splice(databases.indexOf(db), 1);
}
async function serviceStart(session, role) {
  const child = await startService(session, role);
  services.push(child);
  return child;
}
async function serviceStop(child) {
  await stopService(child);
  services.splice(services.indexOf(child), 1);
}
const migrate = session => command(process.execPath, ['apps/commerce/dist/migrate.js'], { env: childEnvironment(session) });
const statusQuery = 'query { platformFoundation { sessionId channelCode message } }';
const forbidden = action => assert.rejects(action, error => error.codes?.some(code => ['FORBIDDEN', 'UNAUTHORIZED'].includes(code)));

try {
  const a = await createSession('A');
  const b = await createSession('B');
  const c = await createSession('C');
  let dbA, dbB, apiA, apiB, worker;
  await check('Migration sur PostgreSQL vide et second passage sans modification', async () => {
    dbA = await dbStart(a);
    await migrate(a);
    const first = await sql(a, 'SELECT name FROM migrations');
    assert.equal(first.rows.length, 1);
    await migrate(a);
    assert.deepEqual((await sql(a, 'SELECT name FROM migrations')).rows, first.rows);
    const tables = await sql(a, "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'");
    assert.ok(Number(tables.rows[0].count) > 30);
  });
  const admin = clientFor(a);
  await check('API authentifiée et worker démarrent sur la configuration applicative', async () => {
    apiA = await serviceStart(a, 'server');
    worker = await serviceStart(a, 'worker');
    await admin.login(a.adminUsername, a.adminPassword);
    assert.equal((await admin.query(statusQuery)).platformFoundation.sessionId, a.id);
  });
  await check('Lecture du socle refusée sans authentification', () => forbidden(() => clientFor(a).query(statusQuery)));
  await check('Requête sans précontrôle CSRF refusée', async () => {
    const response = await fetch(`http://127.0.0.1:${a.apiPort}/admin-api`, {
      method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ query: statusQuery }),
    });
    assert.equal(response.status, 400);
    assert.match(JSON.stringify(await response.json()), /CSRF/);
  });
  const channelId = (await admin.query('query { activeChannel { id } }')).activeChannel.id;
  const password = randomBytes(24).toString('hex');
  secrets.push(password);
  const catalogue = clientFor(a);
  const foundation = clientFor(a);
  await check('Compte catalogue refusé sur la permission propre au socle', async () => {
    const email = await createReader(admin, channelId, 'catalogue-reader', password, ['ReadCatalog']);
    await catalogue.login(email, password);
    assert.equal((await catalogue.query('query { products { totalItems } }')).products.totalItems, 0);
    await forbidden(() => catalogue.query(statusQuery));
    await forbidden(() => catalogue.query('mutation { createProduct(input: {translations: [{languageCode: en, name: "Interdit", slug: "interdit", description: ""}]}) {id} }'));
  });
  await check('Permission du socle accordée sans ouvrir le catalogue', async () => {
    const email = await createReader(admin, channelId, 'foundation-reader', password, ['ReadPlatformFoundation']);
    await foundation.login(email, password);
    assert.equal((await foundation.query(statusQuery)).platformFoundation.sessionId, a.id);
    await forbidden(() => foundation.query('query { products { totalItems } }'));
  });
  let productId;
  await check('Donnée de démonstration créée puis relue par API', async () => {
    const data = await admin.query(`mutation {
      createProduct(input: { translations: [{
        languageCode: en, name: "Preuve de restauration S00", slug: "preuve-s00", description: "Données de démonstration"
      }] }) { id name }
    }`);
    productId = data.createProduct.id;
    assert.equal(data.createProduct.name, 'Preuve de restauration S00');
    await writeFile(path.join(a.mediaDir, 'preuve.txt'), 'Média de démonstration S00');
  });
  await check('Deux sessions actives ont des bases, comptes et médias indépendants', async () => {
    dbB = await dbStart(b);
    await migrate(b);
    apiB = await serviceStart(b, 'server');
    const adminB = clientFor(b);
    await assert.rejects(() => adminB.login(a.adminUsername, a.adminPassword), /refusée/);
    await adminB.login(b.adminUsername, b.adminPassword);
    assert.equal((await adminB.query(statusQuery)).platformFoundation.sessionId, b.id);
    assert.equal((await adminB.query('query { products { totalItems } }')).products.totalItems, 0);
    assert.equal((await admin.query('query { products { totalItems } }')).products.totalItems, 1);
    await assert.rejects(() => access(path.join(b.mediaDir, 'preuve.txt')), { code: 'ENOENT' });
  });
  await check('Sauvegarde refusée lorsque PostgreSQL est encore actif', () => assert.rejects(() => backupSession(a)));
  await check('Arrêt propre de nos API, worker et instances PostgreSQL', async () => {
    await serviceStop(worker);
    await serviceStop(apiA);
    await serviceStop(apiB);
    await dbStop(dbA);
    await dbStop(dbB);
    await assertPortsFree([a.apiPort, a.postgresPort, b.apiPort, b.postgresPort]);
    await assert.rejects(() => access(path.join(a.postgresDir, 'postmaster.pid')), { code: 'ENOENT' });
  });
  let restored;
  await check('Sauvegarde physique à froid et restauration dans une destination vide', async () => {
    const archive = await backupSession(a);
    await assert.rejects(() => restoreSession(archive, b), /déjà des données/);
    restored = await restoreSession(archive, c);
    assert.equal(await readFile(path.join(c.mediaDir, 'preuve.txt'), 'utf8'), 'Média de démonstration S00');
  });
  await check('Relecture API après restauration : données, migration et permissions conservées', async () => {
    const db = await dbStart(restored);
    await migrate(restored);
    const api = await serviceStart(restored, 'server');
    const reader = clientFor(restored);
    await reader.login(restored.adminUsername, restored.adminPassword);
    const data = await reader.query('query ($id: ID!) { product(id: $id) { id name } }', { id: productId });
    assert.equal(data.product.name, 'Preuve de restauration S00');
    assert.equal((await reader.query(statusQuery)).platformFoundation.sessionId, c.id);
    const limited = clientFor(restored);
    await limited.login('catalogue-reader@local.test', password);
    await forbidden(() => limited.query(statusQuery));
    assert.equal((await sql(restored, 'SELECT name FROM migrations')).rows.length, 1);
    await serviceStop(api);
    await dbStop(db);
  });
  for (const scenario of [
    { signal: 'SIGTERM', name: 'Arrêt demandé par SIGTERM répété', expectedCode: 0 },
    { signal: 'SIGINT', name: 'Arrêt demandé par SIGINT répété', expectedCode: 0 },
    { failedService: 'server', name: 'Arrêt inattendu de l’API réelle', expectedCode: 1 },
    { failedService: 'postgres', name: 'Arrêt inattendu du processus PostgreSQL réel', expectedCode: 1 },
  ]) {
  await check(`${scenario.name} : code attendu, ports libérés et verrou retiré`, async () => {
    const launcher = fork(path.join(root, 'infra/dev/run.mjs'), [], {
      cwd: root, env: childEnvironment(a), stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    services.push(launcher);
    const ready = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Lanceur indisponible après 60 secondes.')), 60_000);
      launcher.once('message', message => { clearTimeout(timer); message.ready ? resolve(message) : reject(new Error('Signal inattendu.')); });
      launcher.once('exit', code => { clearTimeout(timer); reject(new Error(`Lanceur arrêté prématurément (${code}).`)); });
      launcher.once('error', error => { clearTimeout(timer); reject(error); });
    });
    const deadline = Date.now() + 60_000;
    let dashboardReady = false;
    while (Date.now() < deadline && !dashboardReady) {
      try { dashboardReady = (await fetch(`http://127.0.0.1:${a.dashboardPort}/dashboard/`, { signal: AbortSignal.timeout(2_000) })).ok; }
      catch {}
      if (!dashboardReady) await delay(250);
    }
    assert.ok(dashboardReady, 'Le serveur Vite doit être disponible avant le test d’arrêt.');
    const privateFile = await fetch(new URL(`/dashboard/@fs${a.file}`, `http://127.0.0.1:${a.dashboardPort}`));
    assert.equal(privateFile.status, 403, 'Vite ne doit pas servir les identifiants locaux du serveur.');
    const exited = once(launcher, 'exit');
    if (scenario.failedService) {
      const pid = ready.services[scenario.failedService];
      assert.ok(Number.isInteger(pid) && pid > 0, 'PID du service lancé par cette recette.');
      process.kill(pid, 'SIGTERM');
    } else {
      launcher.kill(scenario.signal);
      await delay(50);
      if (launcher.exitCode === null && launcher.signalCode === null) launcher.kill(scenario.signal);
    }
    const timer = setTimeout(() => launcher.kill('SIGKILL'), 20_000);
    try { assert.equal((await exited)[0], scenario.expectedCode); } finally { clearTimeout(timer); }
    services.splice(services.indexOf(launcher), 1);
    await assert.rejects(() => access(path.join(a.dataDir, 'running.lock')), { code: 'ENOENT' });
    await assert.rejects(() => access(path.join(a.postgresDir, 'postmaster.pid')), { code: 'ENOENT' });
    await assertPortsFree([a.apiPort, a.dashboardPort, a.postgresPort]);
  });
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = sanitize(error.message);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  for (const child of services.reverse()) await stopService(child);
  for (const db of databases.reverse()) await db.stop();
  report.finishedAt = new Date().toISOString();
  report.lockfileSha256 = createHash('sha256').update(await readFile(path.join(root, 'package-lock.json'))).digest('hex');
  report.sourceSha256 = await sourceHashes();
  await writeFile(path.join(reportDir, 'integration.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Rapport : ${path.relative(root, path.join(reportDir, 'integration.json'))} (${report.status}).`);
}
process.exit(process.exitCode ?? 0);
