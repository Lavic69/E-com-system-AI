import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { prepareSession, childEnvironment } from '../../dev/session.mjs';
import { startPostgres, databaseClient } from '../../dev/postgres.mjs';
import { clientFor, createReader } from '../../dev/graphql.mjs';

const require = createRequire(import.meta.url);
const { DataSource } = require('typeorm');
const { canonical, digest } = require('../../../apps/commerce/dist/plugins/operations/canonical');
const { validate } = require('../../../apps/commerce/dist/plugins/operations/contracts');
const { schemaHash } = require('../../../apps/commerce/dist/plugins/operations/generated/schema-hash');
const { appendEvent, receiveEvent } = require('../../../apps/commerce/dist/plugins/operations/journal');
const root = process.cwd();

test('Formats communs générés et canonisation versionnée', async (t) => {
  const schema = await readFile('packages/contracts/contracts.schema.json');
  assert.equal(createHash('sha256').update(schema).digest('hex'), schemaHash);
  const examples = JSON.parse(await readFile('packages/contracts/examples.json'));
  for (const item of examples.cases) validate(item.contract, item.value);
  for (const item of examples.negativeCases.filter((n) => n.expectedLayer === 'schema')) {
    const base = examples.cases.find((c) => c.id === item.baseCase);
    const value = structuredClone(base.value);
    let parent = value;
    for (const part of item.path.slice(0, -1)) parent = parent[part];
    if (item.remove) delete parent[item.path.at(-1)];
    else parent[item.path.at(-1)] = item.value;
    assert.throws(() => validate(base.contract, value), item.id);
  }
  assert.equal(canonical({ é: 'été', a: 1 }), '{"a":1,"é":"été"}');
  assert.equal(digest({ é: 'été', a: 1 }), 'sha256:86427212ab41a7b8c7d407ffa95aae7917146a6e3d2cbbe479c26276a0ad0619');
  assert.equal(digest({ a: 1, é: 'été' }), digest({ é: 'été', a: 1 }));
  // GraphQL JSON literals use a null prototype; they have the same JSON meaning.
  const literal = Object.assign(Object.create(null), { minor: 0, currency: 'EUR', scale: 2 });
  assert.equal(digest(literal), digest({ minor: 0, currency: 'EUR', scale: 2 }));
  Object.defineProperty(literal, 'hidden', { get: () => 1, enumerable: true });
  assert.throws(() => canonical(literal));
  for (const value of [
    undefined,
    NaN,
    Infinity,
    -0,
    1.5,
    2 ** 53,
    '\ud800',
    'e\u0301',
    new Date(),
    [undefined],
    Array(1),
    { x: undefined },
  ])
    assert.throws(() => canonical(value));
  const sparse = Array(1);
  sparse.extra = 'hidden';
  assert.throws(() => canonical(sparse));
  const getter = [];
  Object.defineProperty(getter, '0', { get: () => 1 });
  assert.throws(() => canonical(getter));
  assert.throws(() => validate('Context', { ...examples.cases[0].value, resolvedAt: '2026-02-30T10:00:00Z' }));
});

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test('S12 : API réelle, PostgreSQL, concurrence et redémarrages', { timeout: 240_000 }, async (t) => {
  await mkdir('.data', { recursive: true });
  const directory = await mkdtemp(path.join(root, '.data/s12-tests-'));
  const session = await prepareSession('C', directory, 'S12');
  session.apiPort = await freePort();
  session.postgresPort = await freePort();
  session.dashboardPort = await freePort();
  await writeFile(session.file, JSON.stringify(session), { mode: 0o600 });
  const receiverPort = await freePort();
  console.log(`S12 test ports API=${session.apiPort}, PG=${session.postgresPort}, receiver=${receiverPort}`);
  const env = {
    ...childEnvironment(session),
    ECOM_PROJECT_ROOT: root,
    S12_RECEIVER: `http://127.0.0.1:${receiverPort}`,
    S12_RECEIVER_PORT: String(receiverPort),
    S12_LEASE_MS: '200',
  };
  const children = new Set();
  let postgres, db, source;
  function start(file, args = [], extra = {}) {
    const child = fork(file, args, { env: { ...env, ...extra }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.output = () => output;
    children.add(child);
    child.on('exit', () => children.delete(child));
    return child;
  }
  async function ready(child) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Startup timeout: ${child.output()}`)), 45_000);
      child.on('message', (message) => {
        if (message.ready) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.on('exit', () => {
        clearTimeout(timer);
        reject(new Error(`Startup failed: ${child.output()}`));
      });
    });
  }
  async function stop(child, signal = 'SIGTERM') {
    if (child.exitCode !== null || child.signalCode) return;
    const exit = once(child, 'exit');
    child.kill(signal);
    await exit;
  }
  const admin = clientFor(session);
  let channelId, receiver, api;
  const money = (minor) => ({ minor, currency: 'USD', scale: 2 });
  const propose = async (input, client = admin, delegationId) =>
    (
      await client.query(
        'mutation($input:JSON!,$delegationId:String){proposeOperation(input:$input,delegationId:$delegationId)}',
        { input, delegationId },
      )
    ).proposeOperation;
  const approve = async (action, client = admin) =>
    (
      await client.query(
        'mutation($id:String!,$binding:String!,$expires:String!){approveOperation(id:$id,bindingDigest:$binding,expiresAt:$expires)}',
        {
          id: action.id,
          binding: action.proposal.bindingDigest,
          expires: new Date(Date.now() + 600_000).toISOString(),
        },
      )
    ).approveOperation;
  const execute = async (action) =>
    (await admin.query('mutation($id:String!){executeOperation(id:$id)}', { id: action.id })).executeOperation;
  const dossier = async (action) =>
    (await admin.query('query($id:String!){operationDossiers(id:$id)}', { id: action.id })).operationDossiers[0];
  const budget = async (id) =>
    (await admin.query('query($id:String!){operationBudget(id:$id)}', { id })).operationBudget;
  const countMail = async () => Number((await db.query('SELECT count(*) FROM s12_fixture_mail')).rows[0].count);
  const intent = (overrides = {}) => ({
    target: { shopId: 's12-local-test', kind: 's12-fixture', id: 'page-fixture', version: '7' },
    proposalVersion: 'proposal-1',
    changeRef: 'fixture:change-1',
    capability: 'email.test',
    effectKey: randomUUID(),
    payload: { recipientId: 'recipient-test-1', body: 'Message local de test', testCost: 240 },
    connectionId: 'mail',
    budgetId: 'budget-main',
    costCeiling: money(300),
    ...overrides,
  });
  const connection = (id = 'mail', lookup = 'supported') => ({
    id,
    shopId: 's12-local-test',
    provider: 'local-mail',
    accountId: id,
    environment: 'simulation',
    state: 'connected',
    secretRef: 'local:no-secret',
    capabilities: [
      { code: 'email.test', lookup, idempotency: lookup, idempotencyWindowSeconds: lookup === 'supported' ? 60 : null },
    ],
    quota: { status: 'known', remaining: 100, unit: 'requests', observedAt: new Date().toISOString(), resetsAt: null },
    perOperationCeiling: money(1000),
    checkedAt: new Date().toISOString(),
  });
  async function configure(document) {
    await admin.query('mutation($input:JSON!){configureOperationConnection(input:$input)}', { input: document });
  }
  async function createBudget(id, ceiling = 1000, known = 0) {
    await admin.query('mutation($id:String!,$ceiling:JSON!){configureOperationBudget(id:$id,ceiling:$ceiling)}', {
      id,
      ceiling: money(ceiling),
    });
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
    await db.query('INSERT INTO s12_budget_period(budget_id,period_start,period_end,known) VALUES($1,$2,$3,$4)', [
      id,
      start,
      end,
      known,
    ]);
  }
  try {
    postgres = await startPostgres(session);
    const migration = start('infra/tests/s12/server.cjs', ['--migrate']);
    const [migrationExit] = await once(migration, 'exit');
    assert.equal(migrationExit, 0, migration.output());
    db = databaseClient(session);
    await db.connect();
    await db.query(`CREATE TABLE s12_fixture_target(id text PRIMARY KEY,channel_id text NOT NULL,version integer NOT NULL,body text NOT NULL);
      CREATE TABLE s12_fixture_effect(action_key text PRIMARY KEY);
      CREATE TABLE s12_fixture_delivery(event_id text PRIMARY KEY);
      CREATE TABLE s12_fixture_projection(account text PRIMARY KEY,sequence integer NOT NULL,state text NOT NULL)`);
    receiver = start('infra/tests/s12/receiver.mjs');
    await ready(receiver);
    api = start('infra/tests/s12/server.cjs');
    await ready(api);
    await admin.login(session.adminUsername, session.adminPassword);
    channelId = (await admin.query('query{activeChannel{id}}')).activeChannel.id;
    await db.query('INSERT INTO s12_fixture_target VALUES($1,$2,7,$3)', ['page-fixture', channelId, 'original']);
    await configure(connection());
    await configure(connection('limited', 'unsupported'));
    await createBudget('budget-main', 10000);
    source = await new DataSource({
      type: 'postgres',
      host: '127.0.0.1',
      port: session.postgresPort,
      database: session.database,
      username: session.databaseUser,
      password: session.databasePassword,
    }).initialize();

    await t.test('Refus API anonyme, rôle de lecture et contexte forgé', async () => {
      await assert.rejects(() => clientFor(session).query('query{operationDossiers}'));
      const reader = clientFor(session);
      const password = randomBytes(24).toString('hex');
      const email = await createReader(admin, channelId, 's12-reader', password, ['ReadOperations']);
      await reader.login(email, password);
      assert.deepEqual((await reader.query('query{operationDossiers}')).operationDossiers, []);
      await assert.rejects(() => propose(intent(), reader));
      await assert.rejects(() => propose({ ...intent(), context: { permissionCodes: ['SuperAdmin'] } }));
      await assert.rejects(() =>
        propose(intent({ target: { shopId: 'other-shop', kind: 's12-fixture', id: 'page-fixture', version: '7' } })),
      );
      await assert.rejects(() =>
        propose(intent({ target: { shopId: 's12-local-test', kind: 'Product', id: '1', version: '1' } })),
      );
      await assert.rejects(() => propose(intent({ costCeiling: money(3.5) })));
      await assert.rejects(() => propose(intent(), admin, 'forged-delegation'));
      const safe = (await reader.query('query{operationConnections}')).operationConnections;
      assert.equal(JSON.stringify(safe).includes('secretRef'), false);
      assert.equal(JSON.stringify(safe).includes('local:no-secret'), false);
      await assert.rejects(() =>
        reader.query(
          'mutation { createProduct(input:{translations:[{languageCode:en,name:"Forbidden",slug:"forbidden",description:""}]}){id}}',
        ),
      );
    });

    await t.test('Liaison sensible, unicité de proposition et approbation persistante', async () => {
      const input = intent();
      const action = await propose(input);
      assert.equal(
        (
          await propose({
            ...input,
            payload: { testCost: 240, body: 'Message local de test', recipientId: 'recipient-test-1' },
          })
        ).id,
        action.id,
      );
      await assert.rejects(() => propose({ ...input, payload: { ...input.payload, body: 'changed' } }));
      const row = (await db.query('SELECT binding FROM s12_action WHERE id=$1', [action.id])).rows[0];
      const paths = [
        ['canonicalization'],
        ['scope', 'shopId'],
        ['scope', 'marketId'],
        ['scope', 'channelId'],
        ['scope', 'languageCode'],
        ['scope', 'currencyCode'],
        ['actor', 'kind'],
        ['actor', 'id'],
        ['actor', 'delegationId'],
        ['policyVersion'],
        ['target', 'shopId'],
        ['target', 'kind'],
        ['target', 'id'],
        ['target', 'version'],
        ['proposal', 'version'],
        ['proposal', 'changeRef'],
        ['proposal', 'payloadDigest'],
        ['capability'],
        ['effectKey'],
        ['connection', 'id'],
        ['connection', 'accountId'],
        ['connection', 'provider'],
        ['connection', 'environment'],
        ['connection', 'capability', 'code'],
        ['connection', 'capability', 'lookup'],
        ['connection', 'capability', 'idempotency'],
        ['connection', 'capability', 'idempotencyWindowSeconds'],
        ['budgetId'],
        ['costCeiling', 'minor'],
        ['costCeiling', 'currency'],
        ['costCeiling', 'scale'],
      ];
      for (const path of paths) {
        const changed = structuredClone(row.binding);
        let node = changed;
        for (const part of path.slice(0, -1)) node = node[part];
        const key = path.at(-1);
        assert.ok(Object.hasOwn(node, key), path.join('.'));
        node[key] = typeof node[key] === 'number' ? node[key] + 1 : `${node[key]}-changed`;
        assert.notEqual(digest(changed), action.proposal.bindingDigest, path.join('.'));
      }
      await assert.rejects(() =>
        admin.query(
          'mutation($id:String!){approveOperation(id:$id,bindingDigest:"wrong",expiresAt:"2099-01-01T00:00:00Z")}',
          { id: action.id },
        ),
      );
      const approved = await approve(action);
      assert.equal(approved.state, 'queued');
      const file = await dossier(action);
      assert.equal(file.approvals.length, 1);
      assert.equal(file.action.authorization.bindingDigest, action.proposal.bindingDigest);
    });

    await t.test('SC04 : cible changée et rollback des écritures de préparation', async () => {
      const before = await countMail();
      const changed = await approve(await propose(intent()));
      await db.query('UPDATE s12_fixture_target SET version=8');
      const result = await execute(changed);
      assert.equal(result.state, 'awaiting_approval');
      assert.equal(result.error.code, 'TARGET_VERSION_CHANGED');
      assert.equal((await dossier(changed)).approvals.length, 1);
      assert.equal(await countMail(), before);
      await db.query('UPDATE s12_fixture_target SET version=7');
      const raced = await approve(await propose(intent()));
      const writer = source.createQueryRunner();
      await writer.connect();
      await writer.startTransaction();
      await writer.query('SELECT id FROM s12_fixture_target FOR UPDATE');
      const applying = execute(raced);
      await delay(50);
      await writer.query('UPDATE s12_fixture_target SET version=8');
      await writer.commitTransaction();
      await writer.release();
      assert.equal((await applying).error.code, 'TARGET_VERSION_CHANGED');
      assert.equal(await countMail(), before);
      await db.query('UPDATE s12_fixture_target SET version=7');
      const rollback = await approve(await propose(intent({ payload: { forceRollback: true } })));
      assert.equal((await execute(rollback)).error.code, 'EDIT_RESERVED');
      assert.equal((await db.query('SELECT body FROM s12_fixture_target')).rows[0].body, 'original');
    });

    await t.test('Révocation des droits et de la délégation après approbation', async () => {
      const actor = clientFor(session);
      const password = randomBytes(24).toString('hex');
      const email = await createReader(admin, channelId, 's12-actor', password, [
        'ProposeOperations',
        'ApplyOperations',
      ]);
      await actor.login(email, password);
      const action = await approve(await propose(intent(), actor));
      await db.query('UPDATE role SET permissions=$1 WHERE code=$2', ['ProposeOperations', 's12-actor']);
      assert.equal((await execute(action)).error.code, 'FORBIDDEN');
      await db.query('UPDATE role SET permissions=$1 WHERE code=$2', [
        'ProposeOperations,ApplyOperations',
        's12-actor',
      ]);
      const userId = (await db.query('SELECT id FROM "user" WHERE identifier=$1', [email])).rows[0].id;
      const beforeAgent = await approve(await propose(intent(), actor));
      const delegation = (
        await admin.query(
          'mutation($user:String!,$ceiling:JSON!,$expires:String!){grantOperationDelegation(userId:$user,agentId:"agent-test",capabilities:["email.test"],ceiling:$ceiling,expiresAt:$expires)}',
          { user: String(userId), ceiling: money(500), expires: new Date(Date.now() + 3600000).toISOString() },
        )
      ).grantOperationDelegation;
      const delegated = await approve(await propose(intent(), actor, delegation));
      await assert.rejects(() => propose(intent(), actor), /AGENT_DELEGATION_REQUIRED/);
      await assert.rejects(() => propose(intent(), admin, delegation));
      await assert.rejects(() =>
        actor.query(
          'mutation { createProduct(input:{translations:[{languageCode:en,name:"Forbidden",slug:"forbidden-agent",description:""}]}){id}}',
        ),
      );
      assert.equal((await execute(beforeAgent)).error.code, 'ACTOR_KIND_CHANGED');
      await admin.query('mutation($id:String!){revokeOperationDelegation(id:$id)}', { id: delegation });
      assert.equal((await execute(delegated)).error.code, 'DELEGATION_REVOKED');
      await assert.rejects(() => propose(intent(), actor), /AGENT_DELEGATION_REQUIRED/);
    });

    await t.test('Politique, expiration, compte modifié et quota inconnu bloquent avant effet', async () => {
      const before = await countMail();
      const policy = await approve(await propose(intent()));
      await db.query(
        "UPDATE s12_action SET document=jsonb_set(document,'{authorization,policyVersion}','\"old-policy\"') WHERE id=$1",
        [policy.id],
      );
      assert.equal((await execute(policy)).error.code, 'POLICY_CHANGED');
      const expired = await approve(await propose(intent()));
      await db.query(
        "UPDATE s12_action SET document=jsonb_set(document,'{authorization,expiresAt}','\"2020-01-01T00:00:00Z\"') WHERE id=$1",
        [expired.id],
      );
      assert.equal((await execute(expired)).error.code, 'APPROVAL_EXPIRED');
      const account = await approve(await propose(intent()));
      await configure({ ...connection(), accountId: 'changed-account' });
      assert.equal((await execute(account)).error.code, 'APPROVAL_BINDING_CHANGED');
      await configure(connection());
      const quota = await approve(await propose(intent()));
      await configure({ ...connection(), quota: { ...connection().quota, status: 'unknown', remaining: null } });
      assert.equal((await execute(quota)).error.code, 'QUOTA_UNAVAILABLE');
      await configure(connection());
      assert.equal(await countMail(), before);
      assert.equal((await dossier(quota)).reservations.length, 0);
    });

    await t.test('Objet et lecture hors canal refusés par API directe', async () => {
      const action = await propose(intent());
      const zone = (await admin.query('mutation{createZone(input:{name:"S12 fixture zone"}){id}}')).createZone;
      const second = (
        await admin.query(
          'mutation($input:CreateChannelInput!){createChannel(input:$input){...on Channel{id token} ...on ErrorResult{errorCode message}}}',
          {
            input: {
              code: 's12-other',
              token: 's12-other-channel',
              defaultLanguageCode: 'en',
              availableLanguageCodes: ['en'],
              defaultCurrencyCode: 'USD',
              availableCurrencyCodes: ['USD'],
              pricesIncludeTax: false,
              defaultTaxZoneId: zone.id,
              defaultShippingZoneId: zone.id,
            },
          },
        )
      ).createChannel;
      assert.ok(second.id, second.message);
      await stop(api);
      api = start('infra/tests/s12/server.cjs');
      await ready(api);
      await admin.login(session.adminUsername, session.adminPassword);
      let token;
      async function otherQuery(query, variables = {}) {
        const response = await fetch(`http://127.0.0.1:${session.apiPort}/admin-api`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'vendure-token': second.token,
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ query, variables }),
        });
        token = response.headers.get('vendure-auth-token') ?? token;
        const body = await response.json();
        if (body.errors) throw new Error(body.errors.map((e) => e.message).join(';'));
        return body.data;
      }
      await otherQuery('mutation($u:String!,$p:String!){login(username:$u,password:$p){...on CurrentUser{id}}}', {
        u: session.adminUsername,
        p: session.adminPassword,
      });
      assert.deepEqual(
        (await otherQuery('query($id:String!){operationDossiers(id:$id)}', { id: action.id })).operationDossiers,
        [],
      );
      await assert.rejects(() => otherQuery('mutation($id:String!){executeOperation(id:$id)}', { id: action.id }));
      await assert.rejects(() =>
        otherQuery('mutation($input:JSON!){proposeOperation(input:$input)}', { input: intent() }),
      );
      const noConnection = intent({
        capability: 'fixture.update',
        connectionId: null,
        budgetId: null,
        costCeiling: money(0),
      });
      let other = (await otherQuery('mutation($input:JSON!){proposeOperation(input:$input)}', { input: noConnection }))
        .proposeOperation;
      other = (
        await otherQuery(
          'mutation($id:String!,$digest:String!,$expires:String!){approveOperation(id:$id,bindingDigest:$digest,expiresAt:$expires)}',
          { id: other.id, digest: other.proposal.bindingDigest, expires: new Date(Date.now() + 600000).toISOString() },
        )
      ).approveOperation;
      const blocked = (await otherQuery('mutation($id:String!){executeOperation(id:$id)}', { id: other.id }))
        .executeOperation;
      assert.equal(blocked.error.code, 'TARGET_NOT_FOUND');
    });

    await t.test('Mutation locale et événement dans la même transaction', async () => {
      const aborted = await approve(
        await propose(
          intent({
            capability: 'fixture.update',
            connectionId: null,
            budgetId: null,
            costCeiling: money(0),
            payload: { crashTransaction: true },
          }),
        ),
      );
      await assert.rejects(() => execute(aborted));
      assert.equal((await db.query('SELECT version FROM s12_fixture_target')).rows[0].version, 7);
      assert.equal((await db.query('SELECT count(*) FROM s12_fixture_effect')).rows[0].count, '0');
      assert.equal((await dossier(aborted)).action.state, 'queued');
      const action = await approve(
        await propose(
          intent({
            capability: 'fixture.update',
            connectionId: null,
            budgetId: null,
            costCeiling: money(0),
            payload: { body: 'local version' },
          }),
        ),
      );
      const results = await Promise.all([execute(action), execute(action)]);
      assert.ok(results.some((r) => r.state === 'succeeded'));
      assert.equal((await db.query('SELECT version FROM s12_fixture_target')).rows[0].version, 8);
      assert.equal((await db.query('SELECT count(*) FROM s12_fixture_effect')).rows[0].count, '1');
      assert.equal(
        (
          await db.query(
            "SELECT count(*) FROM s12_outbox WHERE document->>'type'='operations.succeeded' AND document->'aggregate'->>'id'=$1",
            [action.id],
          )
        ).rows[0].count,
        '1',
      );
      await execute(action);
      assert.equal((await db.query('SELECT count(*) FROM s12_fixture_effect')).rows[0].count, '1');
      await db.query("UPDATE s12_fixture_target SET version=7,body='original'");
    });

    await t.test('SC07 : coût incertain, réserve conservée et reçu imputé une fois', async () => {
      await createBudget('budget-sc07', 1000, 200);
      const action = await approve(
        await propose(intent({ budgetId: 'budget-sc07', payload: { testCost: 240, loseResponse: true } })),
      );
      assert.equal((await execute(action)).state, 'uncertain');
      assert.equal((await budget('budget-sc07')).available, 500);
      const pending = await dossier(action);
      assert.equal(pending.reservations[0].knownCost, null);
      assert.equal(pending.reservations[0].held.minor, 300);
      assert.equal((await execute(action)).state, 'succeeded');
      const result = await budget('budget-sc07');
      assert.equal(result.known, 440);
      assert.equal(result.held, 0);
      assert.equal(result.available, 560);
      await execute(action);
      assert.equal((await budget('budget-sc07')).known, 440);
    });

    await t.test('Deux réservations concurrentes ne dépassent pas le solde', async () => {
      await createBudget('budget-race', 500);
      const actions = await Promise.all(
        [1, 2].map(async (n) =>
          approve(
            await propose(intent({ budgetId: 'budget-race', payload: { testCost: 300, loseResponse: true, n } })),
          ),
        ),
      );
      const results = await Promise.all(actions.map(execute));
      assert.equal(results.filter((r) => r.state === 'uncertain').length, 1);
      assert.equal(results.filter((r) => r.error?.code === 'BUDGET_EXCEEDED').length, 1);
      assert.equal((await budget('budget-race')).held, 300);
    });

    await t.test('Changement de période et dépassement réel sans troncature', async () => {
      await createBudget('budget-period', 1000);
      const action = await approve(
        await propose(intent({ budgetId: 'budget-period', payload: { testCost: 240, loseResponse: true } })),
      );
      await execute(action);
      const now = new Date();
      const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString();
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      await db.query(
        "UPDATE s12_reservation SET document=jsonb_set(jsonb_set(document,'{periodStart}',to_jsonb($1::text)),'{periodEnd}',to_jsonb($2::text)) WHERE budget_id='budget-period'",
        [previous, end],
      );
      await db.query("UPDATE s12_budget_period SET period_start=$1,period_end=$2 WHERE budget_id='budget-period'", [
        previous,
        end,
      ]);
      assert.equal((await budget('budget-period')).available, 700);
      await execute(action);
      assert.equal((await budget('budget-period')).held, 0);
      assert.equal(
        (await db.query("SELECT known FROM s12_budget_period WHERE budget_id='budget-period'")).rows[0].known,
        '240',
      );
      await createBudget('budget-overrun', 1000);
      const over = await approve(await propose(intent({ budgetId: 'budget-overrun', payload: { testCost: 400 } })));
      const result = await execute(over);
      assert.equal(result.state, 'succeeded');
      assert.equal(result.error.code, 'COST_CEILING_EXCEEDED');
      assert.equal((await budget('budget-overrun')).known, 400);
      assert.equal((await budget('budget-overrun')).blocked, true);
    });

    await t.test('SC08 : fournisseur limité, aucune retransmission automatique', async () => {
      const action = await approve(
        await propose(intent({ connectionId: 'limited', payload: { testCost: 100, loseResponse: true } })),
      );
      await execute(action);
      const count = await countMail();
      const result = await execute(action);
      assert.equal(result.state, 'uncertain');
      assert.equal(result.error.code, 'MANUAL_RECONCILIATION_REQUIRED');
      assert.equal(await countMail(), count);
      assert.equal((await dossier(action)).reservations[0].held.minor, 300);
    });

    await t.test('Crash réel après réception, redémarrage du worker et du récepteur', async () => {
      const action = await approve(await propose(intent({ payload: { testCost: 240, holdResponse: true } })));
      const before = await countMail();
      const accepted = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('No durable receiver receipt')), 15000);
        receiver.on('message', (m) => {
          if (m.accepted === action.operations[0].idempotencyKey) {
            clearTimeout(timer);
            resolve();
          }
        });
      });
      const worker = start('infra/tests/s12/server.cjs', ['--execute'], { S12_ACTION_ID: action.id });
      await accepted;
      await stop(worker, 'SIGKILL');
      assert.equal(await countMail(), before + 1);
      await stop(receiver);
      receiver = start('infra/tests/s12/receiver.mjs');
      await ready(receiver);
      const resumed = start('infra/tests/s12/server.cjs', ['--execute'], { S12_ACTION_ID: action.id });
      const [code] = await once(resumed, 'exit');
      assert.equal(code, 0, resumed.output());
      const current = await dossier(action);
      assert.equal(current.action.state, 'succeeded');
      assert.equal(current.reservations[0].knownCost.minor, 240);
      assert.equal(current.action.operations[0].attemptCount, 1);
      assert.equal(await countMail(), before + 1);
    });

    await t.test('Deux processus worker gardent un seul message et une réservation', async () => {
      const action = await approve(await propose(intent()));
      const before = await countMail();
      const workers = [1, 2].map(() =>
        start('infra/tests/s12/server.cjs', ['--execute'], { S12_ACTION_ID: action.id }),
      );
      const exits = await Promise.all(workers.map((w) => once(w, 'exit')));
      exits.forEach(([code], i) => assert.equal(code, 0, workers[i].output()));
      const file = await dossier(action);
      assert.equal(file.action.state, 'succeeded');
      assert.equal(file.reservations.length, 1);
      assert.equal(file.action.operations[0].attemptCount, 1);
      assert.equal(await countMail(), before + 1);
    });

    await t.test('Journal après crash entre commit et émission, puis avant accusé', async () => {
      const worker = start('infra/tests/s12/server.cjs', ['--deliver']);
      const delivered = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`No delivery: ${worker.output()}`)), 15000);
        worker.on('message', (m) => {
          if (m.delivered) {
            clearTimeout(timer);
            resolve(m.delivered);
          }
        });
        worker.on('exit', () => {
          clearTimeout(timer);
          reject(new Error(worker.output()));
        });
      });
      await stop(worker, 'SIGKILL');
      assert.equal(
        (await db.query('SELECT delivered_at FROM s12_outbox WHERE id=$1', [delivered])).rows[0].delivered_at,
        null,
      );
      const [row] = (await db.query('SELECT document FROM s12_outbox WHERE id=$1', [delivered])).rows;
      const consumer = {
        id: 'durable-receiver',
        accepts: () => true,
        validatePayload: (e) => e.type.startsWith('operations.') && e.payloadVersion === 1,
        apply: async (manager, event) => {
          await manager.query('INSERT INTO s12_fixture_delivery(event_id) VALUES($1) ON CONFLICT DO NOTHING', [
            event.eventId,
          ]);
        },
      };
      await source.transaction((manager) => receiveEvent(manager, 's12-local-test', consumer, row.document));
      await source.transaction((manager) => receiveEvent(manager, 's12-local-test', consumer, row.document));
      assert.equal(
        (await db.query('SELECT count(*) FROM s12_fixture_delivery WHERE event_id=$1', [delivered])).rows[0].count,
        '1',
      );
      await stop(api);
      api = start('infra/tests/s12/server.cjs');
      await ready(api);
      await admin.login(session.adminUsername, session.adminPassword);
      assert.ok((await admin.query('query{operationDossiers}')).operationDossiers.length > 0);
    });

    await t.test('SC03 : doublon, désordre, trou, autre compte, conflit et rollback', async () => {
      const example = JSON.parse(await readFile('packages/contracts/examples.json')).cases.find(
        (c) => c.contract === 'Event',
      ).value;
      const event = {
        ...example,
        eventId: randomUUID(),
        scope: { ...example.scope, shopId: 's12-local-test', channelId },
        aggregate: { shopId: 's12-local-test', kind: 'fixture-payment', id: 'p1' },
        type: 'fixture.payment',
        payloadVersion: 1,
        source: { kind: 'provider', module: 'fixture', accountId: 'a', sourceEventId: 'settled' },
        sequence: 2,
        deduplicationKey: 'settled',
        payload: { state: 'settled', minor: 5500 },
      };
      const consumer = {
        id: 'payments-test',
        accepts: (e) => e.source.module === 'fixture',
        validatePayload: (e) => e.type === 'fixture.payment' && e.payloadVersion === 1,
        apply: async (manager, e) => {
          await manager.query(
            'INSERT INTO s12_fixture_projection(account,sequence,state) VALUES($1,$2,$3) ON CONFLICT(account) DO UPDATE SET sequence=EXCLUDED.sequence,state=EXCLUDED.state',
            [e.source.accountId, e.sequence, e.payload.state],
          );
        },
        reconcile: async (manager, e) => {
          await manager.query(
            'INSERT INTO s12_fixture_projection(account,sequence,state) VALUES($1,2,$2) ON CONFLICT(account) DO UPDATE SET sequence=2,state=EXCLUDED.state',
            [e.source.accountId, 'settled'],
          );
          return 2;
        },
      };
      const receive = (e) => source.transaction((manager) => receiveEvent(manager, 's12-local-test', consumer, e));
      assert.equal(await receive(event), 'applied');
      assert.equal(await receive({ ...event, receivedAt: new Date().toISOString() }), 'duplicate');
      assert.equal(
        await receive({
          ...event,
          eventId: randomUUID(),
          source: { ...event.source, sourceEventId: 'authorized' },
          sequence: 1,
          deduplicationKey: 'authorized',
          payload: { state: 'authorized', minor: 5500 },
        }),
        'stale',
      );
      assert.equal(
        (await db.query("SELECT state FROM s12_fixture_projection WHERE account='a'")).rows[0].state,
        'settled',
      );
      assert.equal(await receive({ ...event, source: { ...event.source, accountId: 'b' } }), 'applied');
      assert.equal(await receive({ ...event, payload: { state: 'settled', minor: 6000 } }), 'conflict');
      assert.equal(await receive({ ...event, deduplicationKey: 'unknown-version', payloadVersion: 2 }), 'quarantined');
      assert.equal(await receive({ ...event, schemaVersion: 2 }), 'quarantined');
      assert.equal(
        await receive({ ...event, deduplicationKey: 'browser', source: { ...event.source, kind: 'browser' } }),
        'quarantined',
      );
      const noReconcile = { ...consumer, id: 'gap-test', reconcile: undefined };
      assert.equal(
        await source.transaction((manager) => receiveEvent(manager, 's12-local-test', noReconcile, event)),
        'gap',
      );
      assert.equal(
        await source.transaction((manager) =>
          receiveEvent(manager, 's12-local-test', noReconcile, {
            ...event,
            deduplicationKey: 'no-sequence',
            sequence: null,
          }),
        ),
        'needs_reconciliation',
      );
      const rollbackEvent = {
        ...event,
        eventId: randomUUID(),
        source: { ...event.source, kind: 'server', accountId: null },
        sequence: 1,
      };
      await assert.rejects(() =>
        source.transaction(async (manager) => {
          await appendEvent(manager, rollbackEvent);
          throw new Error('rollback');
        }),
      );
      assert.equal(
        (await db.query('SELECT count(*) FROM s12_outbox WHERE id=$1', [rollbackEvent.eventId])).rows[0].count,
        '0',
      );
    });
  } finally {
    for (const child of [...children]) await stop(child);
    await source?.destroy();
    await db?.end();
    await postgres?.stop();
  }
});
