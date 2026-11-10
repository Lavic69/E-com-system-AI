import { fork, spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prepareSession, childEnvironment, assertPortsFree } from '../../dev/session.mjs';
import pg from 'pg';
import { startService, stopService } from '../../dev/processes.mjs';
import { clientFor } from '../../dev/graphql.mjs';

const session = process.env.ECOM_SESSION_FILE
  ? JSON.parse(await readFile(process.env.ECOM_SESSION_FILE, 'utf8'))
  : await prepareSession('C', process.cwd(), 'S12');
await assertPortsFree([session.apiPort, session.dashboardPort, session.postgresPort]);
const probe = net.createServer();
await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
const receiverPort = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const env = {
  ...childEnvironment(session),
  ECOM_PROJECT_ROOT: process.cwd(),
  S12_RECEIVER: `http://127.0.0.1:${receiverPort}`,
  S12_RECEIVER_PORT: String(receiverPort),
  S12_LEASE_MS: '30000',
};
const children = [];
let postgres,
  db,
  stopping = false;
function start(file, args = []) {
  const child = fork(file, args, { env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], detached: true });
  children.push(child);
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return child;
}
const ready = (child) =>
  new Promise((resolve, reject) => {
    child.on('message', (m) => {
      if (m.ready) resolve();
    });
    child.on('exit', (code) => reject(new Error(`Service stopped: ${code}`)));
  });
async function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children.reverse())
    if (child.exitCode === null && !child.signalCode) {
      const done = once(child, 'exit');
      child.kill('SIGTERM');
      await done;
    }
  await db?.end();
  await stopService(postgres);
}
process.on('SIGTERM', () => void stop().then(() => process.exit(0)));
process.on('SIGINT', () => void stop().then(() => process.exit(0)));
try {
  postgres = await startService(session, 'postgres', { detached: true });
  const migration = start('infra/tests/s12/server.cjs', ['--migrate']);
  if ((await once(migration, 'exit'))[0] !== 0) throw new Error('Migration failed');
  db = new pg.Client({
    host: '127.0.0.1',
    port: session.postgresPort,
    database: session.database,
    user: session.databaseUser,
    password: session.databasePassword,
  });
  await db.connect();
  await db.query(`CREATE TABLE IF NOT EXISTS s12_fixture_target(id text PRIMARY KEY,channel_id text NOT NULL,version integer NOT NULL,body text NOT NULL);
    CREATE TABLE IF NOT EXISTS s12_fixture_effect(action_key text PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS s12_fixture_delivery(event_id text PRIMARY KEY)`);
  const receiver = start('infra/tests/s12/receiver.mjs');
  await ready(receiver);
  const api = start('infra/tests/s12/server.cjs');
  await ready(api);
  const client = clientFor(session);
  await client.login(session.adminUsername, session.adminPassword);
  const channelId = (await client.query('query{activeChannel{id}}')).activeChannel.id;
  const money = (minor) => ({ minor, currency: 'USD', scale: 2 });
  await client.query('mutation($input:JSON!){configureOperationConnection(input:$input)}', {
    input: {
      id: 'mail-demo',
      shopId: 's12-local-test',
      provider: 'local-mail',
      accountId: 's12-preview',
      environment: 'simulation',
      state: 'connected',
      secretRef: 'local:no-secret',
      capabilities: [
        { code: 'email.test', lookup: 'unsupported', idempotency: 'unsupported', idempotencyWindowSeconds: null },
      ],
      quota: {
        status: 'known',
        remaining: 100,
        unit: 'requests',
        observedAt: new Date().toISOString(),
        resetsAt: null,
      },
      perOperationCeiling: money(1000),
      checkedAt: new Date().toISOString(),
    },
  });
  await db.query(
    "INSERT INTO s12_budget(id,shop_id,channel_id,currency,ceiling) VALUES('budget-demo','s12-local-test',$1,'USD',100000) ON CONFLICT DO NOTHING",
    [channelId],
  );
  const count = Number((await db.query('SELECT count(*) FROM s12_action')).rows[0].count);
  if (!count)
    for (const [label, state] of [
      ['Accueil · titre de page', 'prepared'],
      ['Présentation du produit', 'succeeded'],
      ['Message de vérification', 'uncertain'],
    ]) {
      const target = randomUUID();
      await db.query('INSERT INTO s12_fixture_target VALUES($1,$2,7,$3)', [target, channelId, label]);
      // The readable label is the target ID for this synthetic recipe.
      await db.query('UPDATE s12_fixture_target SET id=$2 WHERE id=$1', [target, label]);
      const input = {
        target: { shopId: 's12-local-test', kind: 's12-fixture', id: label, version: '7' },
        proposalVersion: 'v8',
        changeRef: 'fixture:local-message',
        capability: 'email.test',
        effectKey: randomUUID(),
        payload: {
          recipientId: 'local-test',
          body: 'Message de recette locale',
          testCost: 240,
          loseResponse: state === 'uncertain',
        },
        connectionId: 'mail-demo',
        budgetId: 'budget-demo',
        costCeiling: money(300),
      };
      let action = (await client.query('mutation($input:JSON!){proposeOperation(input:$input)}', { input }))
        .proposeOperation;
      if (state !== 'prepared') {
        action = (
          await client.query(
            'mutation($id:String!,$digest:String!,$expires:String!){approveOperation(id:$id,bindingDigest:$digest,expiresAt:$expires)}',
            {
              id: action.id,
              digest: action.proposal.bindingDigest,
              expires: new Date(Date.now() + 3600000).toISOString(),
            },
          )
        ).approveOperation;
        await client.query('mutation($id:String!){executeOperation(id:$id)}', { id: action.id });
      }
    }
  const vite = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--config', 'infra/tests/s12/vite.config.mts'],
    { env, stdio: ['ignore', 'pipe', 'pipe'], detached: true },
  );
  children.push(vite);
  vite.stdout.on('data', (chunk) => process.stdout.write(chunk));
  vite.stderr.on('data', (chunk) => process.stderr.write(chunk));
  vite.on('exit', (code) => {
    if (!stopping) {
      console.error(`Dashboard arrêté (${code ?? 'signal'}). Arrêt des ressources S12.`);
      void stop().then(() => {
        process.exitCode = code ?? 1;
      });
    }
  });
  await writeFile(
    path.join(session.dataDir, 's12-resources.json'),
    JSON.stringify({
      apiPort: session.apiPort,
      postgresPort: session.postgresPort,
      dashboardPort: session.dashboardPort,
      receiverPort,
      pid: process.pid,
    }),
  );
  console.log(
    `S12 local API ${session.apiPort}, PostgreSQL ${session.postgresPort}, receiver ${receiverPort}. Credentials stay in session.json.`,
  );
  process.send?.({ ready: true, receiverPort });
} catch (error) {
  console.error(error.message);
  await stop();
  process.exitCode = 1;
}
