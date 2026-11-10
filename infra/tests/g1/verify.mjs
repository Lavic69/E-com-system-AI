import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { root, prepareSession, childEnvironment, assertPortsFree } from '../../dev/session.mjs';
import { startService, stopService } from '../../dev/processes.mjs';
import { startPostgres, databaseClient } from '../../dev/postgres.mjs';
import { backupSession, restoreSession } from '../../dev/backup.mjs';
import { apiClient, freePort, startApi as startFoundation, createMember } from '../s10/runtime.mjs';
import { seed } from '../s10/fixtures.mjs';

const output = path.join(root, 'docs/livraisons/G1/preuves');
await mkdir(output, { recursive: true });
const directory = await mkdtemp(path.join(root, '.data/g1-verify-'));
const report = { startedAt: new Date().toISOString(), base_sha: '2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086', status: 'running', cases: [] };
const secrets = [], sessions = [];
let server, worker, db, session;
async function makeSession(slot) {
  const s = await prepareSession(slot, directory, 'G1');
  s.apiPort = await freePort(); s.dashboardPort = await freePort(); s.postgresPort = await freePort();
  await writeFile(s.file, JSON.stringify(s), { mode: 0o600 });
  sessions.push(s); secrets.push(s.adminPassword, s.databasePassword, s.cookieSecret); return s;
}
async function sql(query, values = [], s = session) {
  const client = databaseClient(s); await client.connect();
  try { return await client.query(query, values); } finally { await client.end(); }
}
async function apiStart(s) {
  const child = fork('infra/tests/g1/server.cjs', [], { cwd: root, env: childEnvironment(s), stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('API G1 indisponible')), 60000);
      child.on('message', m => { if (m.ready) { clearTimeout(timer); resolve(); } });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`API G1 arrêtée : ${code}`)); });
      child.once('error', error => { clearTimeout(timer); reject(error); });
    }); return child;
  } catch (e) { await stopService(child); throw e; }
}
async function check(name, work) {
  const item = { name, status: 'running' }; report.cases.push(item);
  try { await work(); item.status = 'passed'; console.log(`✓ ${name}`); }
  catch (error) { item.status = 'failed'; throw error; }
}
async function eventually(work, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await work()) return; await delay(150); }
  assert.fail('État durable attendu non atteint');
}
const fields = 'id revision headVersion fencingToken selectedVersion';
const document = (title, productId) => ({ title, blocks: [{ id: 'intro', type: 'text', text: 'Contenu intégré G1' }, { id: 'produit', type: 'product', productId }] });
let admin, be, us, fixtures, productId, uiAccounts;
const detail = (id, who = be) => who.query(`query($id:ID!){contentPage(id:$id){${fields} title versions{version document contentDigest state}}}`, { id }).then(d => d.contentPage);
async function page(slug, who = be, lang = 'fr', product = productId) {
  const { createContentPage: p } = await who.query(`mutation($input:CreateContentPageInput!){createContentPage(input:$input){${fields}}}`, { input: { slug, languageCode: lang, document: document(slug, product) } });
  return (await who.query(`mutation($id:ID!,$r:Int!){acquireContentLease(pageId:$id,expectedRevision:$r){${fields}}}`, { id: p.id, r: p.revision })).acquireContentLease;
}
async function propose(p, overrides = {}, who = be, currency = 'EUR') {
  const input = { target: { shopId: (session.shopId ?? `local:${session.database}`), kind: 'content-page', id: p.id, version: String(p.revision) }, proposalVersion: '1', changeRef: `g1-change:${p.id}`, capability: 'content.save', effectKey: `g1-save:${p.id}:${p.revision}`, payload: { headVersion: p.headVersion, fencingToken: p.fencingToken, document: document(`Page appliquée ${p.id}`, productId), validate: true }, connectionId: null, budgetId: null, costCeiling: { minor: 0, currency, scale: 2 }, ...overrides };
  return (await who.query('mutation($input:JSON!){proposeOperation(input:$input)}', { input })).proposeOperation;
}
async function approve(action, who = be) {
  return (await who.query('mutation($id:String!,$hash:String!,$expires:String!){approveOperation(id:$id,bindingDigest:$hash,expiresAt:$expires)}', { id: action.id, hash: action.proposal.bindingDigest, expires: new Date(Date.now()+60000).toISOString() })).approveOperation;
}
const execute = (a, who = be) => who.query('mutation($id:String!){executeOperation(id:$id)}', { id: a.id }).then(d => d.executeOperation);
const nativeSave = (p, who = be) => who.query(`mutation($input:SaveContentVersionInput!){saveContentVersion(input:$input){${fields}}}`, { input: { pageId: p.id, expectedRevision: p.revision, fencingToken: p.fencingToken, document: document('Modification native', productId), validate: false } });
try {
  const source = await makeSession('A'), target = await makeSession('B');
  let witness, before, mediaHash;
  await check('G0 rempli avec marchés, prix, stocks, rôle et média avant sauvegarde', async () => {
    session = source; db = await startPostgres(source); server = await startFoundation(source, ['--foundation']);
    fixtures = await seed(source); secrets.push(fixtures.password);
    const a = apiClient(source, { channel: fixtures.channels.be.token }); await a.login();
    witness = (await a.query('mutation{createProduct(input:{translations:[{languageCode:fr,name:"Témoin G0",slug:"temoin-g1",description:"À conserver"}]}){id}}')).createProduct.id;
    await a.query('mutation($input:[CreateProductVariantInput!]!){createProductVariants(input:$input){id}}', { input: [{ productId: witness, sku: 'G0-WITNESS', price: 2450, translations: [{ languageCode: 'fr', name: 'Témoin' }], stockLevels: [{ stockLocationId: fixtures.locations[0].id, stockOnHand: 8 }] }] });
    const asset = (await a.upload()).createAssets[0];
    await a.query('mutation($input:UpdateProductInput!){updateProduct(input:$input){id}}', { input: { id: witness, assetIds: [asset.id], featuredAssetId: asset.id } });
    before = (await a.query('query($id:ID!){product(id:$id){name variants{sku price stockOnHand} featuredAsset{id preview}}}', { id: witness })).product;
    mediaHash = createHash('sha256').update(Buffer.from(await (await fetch(before.featuredAsset.preview)).arrayBuffer())).digest('hex');
    assert.equal((await sql('SELECT name FROM migrations')).rowCount, 1);
  });
  await check('Copie froide G0 puis cinq migrations ordonnées et conservation des données', async () => {
    await stopService(server); server = undefined; await db.stop(); db = undefined;
    session = await restoreSession(await backupSession(source), target);
    db = await startPostgres(session); server = await apiStart(session);
    admin = apiClient(session); await admin.login();
    be = apiClient(session, { channel: fixtures.channels.be.token }); await be.login();
    us = apiClient(session, { channel: fixtures.channels.us.token }); await us.login();
    report.migrations = (await sql('SELECT name FROM migrations ORDER BY id')).rows.map(r => r.name);
    assert.deepEqual(report.migrations, ['InitialSchema1792513149156', 'Operations1792513200000', 'CatalogueS101794309752560', 'ContentPages1794355200000', 'PlatformActionProjection1794390000000']);
    const after = (await be.query('query($id:ID!){product(id:$id){name variants{sku price stockOnHand} featuredAsset{id preview}}}', { id: witness })).product;
    assert.equal(createHash('sha256').update(Buffer.from(await (await fetch(after.featuredAsset.preview)).arrayBuffer())).digest('hex'), mediaHash);
    before.featuredAsset.preview = after.featuredAsset.preview; assert.deepEqual(after, before);
  });
  await check('Import S10 réel, reprise sans doublon et lecture Shop API', async () => {
    const csv = 'key,name,sku,price,stock\ng1-main,Produit G1,G1-PRODUCT,1290,7';
    const variables = { csv, location: fixtures.locations[0].id };
    const preview = (await be.query('query($csv:String!,$location:ID!){previewCatalogueImport(csv:$csv,stockLocationId:$location){previewHash}}', variables)).previewCatalogueImport;
    const mutation = 'mutation($csv:String!,$location:ID!,$hash:String!){applyCatalogueImport(csv:$csv,stockLocationId:$location,previewHash:$hash){rows{productId variantId status}}}';
    const first = (await be.query(mutation, { ...variables, hash: preview.previewHash })).applyCatalogueImport.rows[0];
    productId = first.productId; assert.ok(productId);
    const again = (await be.query('query($csv:String!,$location:ID!){previewCatalogueImport(csv:$csv,stockLocationId:$location){previewHash}}', variables)).previewCatalogueImport;
    assert.equal((await be.query(mutation, { ...variables, hash: again.previewHash })).applyCatalogueImport.rows[0].productId, productId);
    const product = (await apiClient(session, { channel: fixtures.channels.be.token, shop: true }).query('query($id:ID!){product(id:$id){id variants{price currencyCode}}}', { id: productId })).product;
    assert.equal(product.variants[0].price, 1290); assert.equal(product.variants[0].currencyCode, 'EUR');
  });
  let integrated, action;
  await check('Page S11 avec produit S10, action S12 appliquée dans la même transaction', async () => {
    integrated = await page('g1-integree'); const original = await detail(integrated.id);
    action = await propose(integrated); await approve(action); const result = await execute(action);
    assert.equal(result.state, 'succeeded'); assert.equal(result.operations[0].attemptCount, 1);
    const after = await detail(integrated.id); assert.equal(after.headVersion, 2); assert.deepEqual(after.versions[1], original.versions[0]);
    assert.equal(after.versions[0].document.blocks[1].productId, productId); assert.equal(after.versions[0].state, 'validated');
    const preview = (await be.query('query($id:ID!){contentPreview(pageId:$id,version:2){blocks localOnly}}', { id: integrated.id })).contentPreview;
    assert.equal(preview.blocks[1].name, 'Produit G1'); assert.equal(preview.localOnly, true);
    assert.equal((await sql("SELECT id FROM s12_outbox WHERE document->>'type'='operations.succeeded' AND document->'payload'->>'actionId'=$1", [action.id])).rowCount, 1);
    assert.equal((await sql('SELECT id FROM s12_reservation')).rowCount, 0);
  });
  await check('Réexécution concurrente : une seule version et un seul événement de réussite', async () => {
    await Promise.all([execute(action), execute(action)]);
    assert.equal((await detail(integrated.id)).headVersion, 2);
    assert.equal((await sql("SELECT id FROM s12_outbox WHERE document->>'type'='operations.succeeded' AND document->'payload'->>'actionId'=$1", [action.id])).rowCount, 1);
  });
  await check('SC04 : modification native après approbation, refus sans nouvelle version', async () => {
    const p = await page('g1-conflit'); const a = await propose(p); await approve(a); await nativeSave(p);
    const result = await execute(a); assert.equal(result.state, 'awaiting_approval'); assert.equal(result.error.code, 'TARGET_VERSION_CHANGED');
    assert.equal((await detail(p.id)).headVersion, 2); assert.equal(result.operations[0].attemptCount, 0);
  });
  await check('Bail renouvelé ou expiré : ancien jeton refusé par le vrai service S11', async () => {
    for (const change of ['renew', 'expire']) {
      const p = await page(`g1-bail-${change}`); const a = await propose(p); await approve(a);
      if (change === 'renew') await be.query('mutation($id:ID!,$token:Int!){renewContentLease(pageId:$id,fencingToken:$token){id}}', { id: p.id, token: p.fencingToken });
      else await sql('UPDATE content_page SET "expiresAt"=now()-interval \'1 second\' WHERE id=$1', [p.id]);
      const result = await execute(a); assert.equal(result.error.code, 'EDIT_LEASE_LOST'); assert.equal((await detail(p.id)).headVersion, 1);
    }
  });
  await check('Référence produit absente : refus conservé et aucune version créée', async () => {
    const p = await page('g1-reference'); const a = await propose(p, { payload: { headVersion: 1, fencingToken: p.fencingToken, document: document('Référence absente', '2147483647'), validate: true } });
    await approve(a); const result = await execute(a); assert.equal(result.error.code, 'CONTENT_REFERENCE_NOT_FOUND'); assert.equal((await detail(p.id)).headVersion, 1);
  });
  await check('Rollback après écriture S11 : version, action et sortie durable annulées ensemble', async () => {
    const p = await page('g1-rollback'); const a = await propose(p); await approve(a);
    await sql(`CREATE FUNCTION g1_fail_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.document->>'type'='operations.succeeded' THEN RAISE EXCEPTION 'G1_FORCED_ROLLBACK'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER g1_fail_outbox BEFORE INSERT ON s12_outbox FOR EACH ROW EXECUTE FUNCTION g1_fail_outbox()`);
    try { await assert.rejects(() => execute(a)); } finally { await sql('DROP TRIGGER g1_fail_outbox ON s12_outbox; DROP FUNCTION g1_fail_outbox()'); }
    assert.equal((await detail(p.id)).headVersion, 1);
    const row = (await sql('SELECT document FROM s12_action WHERE id=$1', [a.id])).rows[0].document;
    assert.equal(row.state, 'queued'); assert.equal(row.operations[0].attemptCount, 0);
    assert.equal((await sql("SELECT id FROM s12_outbox WHERE document->>'type'='operations.succeeded' AND document->'payload'->>'actionId'=$1", [a.id])).rowCount, 0);
    assert.equal((await execute(a)).state, 'succeeded');
  });
  await check('Arrêt brutal API avant commit : aucune version partielle, reprise unique après redémarrage', async () => {
    const p = await page('g1-crash'); const a = await propose(p); await approve(a);
    await sql(`CREATE FUNCTION g1_pause_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.document->>'type'='operations.succeeded' THEN PERFORM pg_sleep(30); END IF; RETURN NEW; END $$;
      CREATE TRIGGER g1_pause_outbox BEFORE INSERT ON s12_outbox FOR EACH ROW EXECUTE FUNCTION g1_pause_outbox()`);
    const pending = execute(a).then(() => 'unexpected-success', () => 'interrupted');
    try {
      await eventually(async () => (await sql("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event='PgSleep'")).rowCount > 0);
      const exited = once(server, 'exit'); server.kill('SIGKILL'); await exited; server = undefined;
      assert.equal(await pending, 'interrupted');
      // PostgreSQL completes cancellation/rollback before the DDL can obtain its lock.
      await sql('DROP TRIGGER g1_pause_outbox ON s12_outbox; DROP FUNCTION g1_pause_outbox()');
    } finally {
      if (server) await sql('DROP TRIGGER IF EXISTS g1_pause_outbox ON s12_outbox; DROP FUNCTION IF EXISTS g1_pause_outbox()');
    }
    server = await apiStart(session);
    assert.equal((await detail(p.id)).headVersion, 1);
    const saved = (await sql('SELECT document FROM s12_action WHERE id=$1', [a.id])).rows[0].document;
    assert.equal(saved.state, 'queued'); assert.equal(saved.operations[0].attemptCount, 0);
    assert.equal((await execute(a)).state, 'succeeded'); assert.equal((await detail(p.id)).headVersion, 2);
  });
  await check('Deux marchés : prix distincts, page US et absence de fuite de page ou action', async () => {
    await be.query('mutation($input:AssignProductsToChannelInput!){assignProductsToChannel(input:$input){id}}', { input: { productIds: [productId], channelId: fixtures.channels.us.id, priceFactor: 1 } });
    const v = (await us.query('query($id:ID!){product(id:$id){variants{id}}}', { id: productId })).product.variants[0];
    await us.query('mutation($input:[UpdateProductVariantInput!]!){updateProductVariants(input:$input){id}}', { input: [{ id: v.id, price: 1590 }] });
    for (const [who, price, currency] of [[be,1290,'EUR'],[us,1590,'USD']]) {
      const current = (await who.query('query($id:ID!){product(id:$id){variants{price currencyCode}}}', { id: productId })).product.variants[0];
      assert.equal(current.price, price); assert.equal(current.currencyCode, currency);
    }
    const p = await page('g1-us', us, 'en'); const a = await propose(p, {}, us, 'USD'); await approve(a, us); assert.equal((await execute(a, us)).state, 'succeeded');
    await assert.rejects(() => detail(p.id), e => e.codes?.includes('CONTENT_NOT_FOUND'));
    assert.deepEqual((await be.query('query($id:String!){operationDossiers(id:$id)}', { id: a.id })).operationDossiers, []);
    const cross = await propose(p, { effectKey: 'cross-channel' }); await approve(cross); assert.equal((await execute(cross)).error.code, 'CONTENT_NOT_FOUND');
  });
  await check('Droits relus avant effet, lecteur refusé, agents et cibles commerciales non activés', async () => {
    const password = randomBytes(24).toString('hex'); secrets.push(password);
    const permissions = ['ReadContent','EditContent','ReadOperations','ProposeOperations','ApplyOperations'];
    const member = await createMember(admin, [fixtures.channels.be.id], 'g1-member', password, permissions);
    const editor = apiClient(session, { channel: fixtures.channels.be.token }); await editor.login(member.email, password);
    const p = await page('g1-permissions', editor); const a = await propose(p, {}, editor); await approve(a);
    await admin.query('mutation($input:UpdateRoleInput!){updateRole(input:$input){id}}', { input: { id: member.roleId, permissions: permissions.filter(x => x !== 'EditContent') } });
    assert.equal((await execute(a)).error.code, 'FORBIDDEN'); assert.equal((await detail(p.id)).headVersion, 1);
    const reader = await createMember(admin, [fixtures.channels.be.id], 'g1-reader', password, ['ReadContent','ReadOperations','ReadCatalog']);
    const read = apiClient(session, { channel: fixtures.channels.be.token }); await read.login(reader.email,password);
    assert.ok((await read.query('query{operationDossiers}')).operationDossiers.length > 0);
    await assert.rejects(() => propose(p, {}, read), e => e.codes?.includes('FORBIDDEN'));
    await assert.rejects(() => nativeSave(p, read), e => e.codes?.includes('FORBIDDEN'));
    await assert.rejects(() => propose(p, { target: { shopId:(session.shopId ?? `local:${session.database}`),kind:'product',id:productId,version:'1' } }), /COMMERCIAL_ADAPTER_NOT_VERIFIED/);
    const agent = await createMember(admin, [fixtures.channels.be.id], 'g1-agent', password, ['ReadOperations','ProposeOperations','ApplyOperations']);
    const agentUser = (await admin.query('query($id:ID!){administrator(id:$id){user{id}}}', { id:agent.id })).administrator.user.id;
    await assert.rejects(() => be.query('mutation($id:String!,$end:String!){grantOperationDelegation(userId:$id,agentId:"g1-agent",capabilities:["content.save"],ceiling:{minor:0,currency:"EUR",scale:2},expiresAt:$end)}', { id:agentUser, end:new Date(Date.now()+60000).toISOString() }), /FORBIDDEN/);
    uiAccounts = {reader:reader.email,password,channel:fixtures.channels.be.token};
    await writeFile(path.join(session.dataDir,'ui-accounts.json'),JSON.stringify(uiAccounts),{mode:0o600});
  });
  await check('Worker arrêté : action approuvée et événement commités survivent au redémarrage complet', async () => {
    const p = await page('g1-worker'); const a = await propose(p); await approve(a);
    await stopService(server); server = undefined; await db.stop(); db = undefined;
    db = await startPostgres(session); server = await apiStart(session);
    assert.equal((await detail(p.id)).headVersion, 1);
    worker = await startService(session,'worker');
    await eventually(async () => (await detail(p.id)).headVersion === 2);
    await eventually(async () => (await sql('SELECT state FROM platform_action_projection WHERE action_id=$1',[a.id])).rows[0]?.state === 'succeeded');
    await eventually(async () => (await sql('SELECT id FROM s12_outbox WHERE delivered_at IS NULL')).rowCount === 0);
    await stopService(worker); worker = undefined;
    const event = (await sql('SELECT id FROM s12_outbox WHERE document->\'payload\'->>\'actionId\'=$1 ORDER BY created_at DESC LIMIT 1',[a.id])).rows[0];
    await sql('UPDATE s12_outbox SET delivered_at=NULL WHERE id=$1',[event.id]);
    worker = await startService(session,'worker');
    await eventually(async () => (await sql("SELECT id FROM s12_reception WHERE status='duplicate'")).rowCount > 0);
    assert.equal((await detail(p.id)).headVersion, 2);
    assert.equal((await sql('SELECT action_id FROM platform_action_projection WHERE action_id=$1',[a.id])).rowCount,1);
    await stopService(worker); worker = undefined;
  });
  await check('Aucune table de simulation S11/S12 dans la configuration intégrée', async () => {
    assert.equal((await sql("SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE 's11_fixture%' OR tablename LIKE 's12_fixture%')")).rowCount,0);
    assert.equal((await sql('SELECT name FROM migrations')).rowCount,5);
  });
  await check('Restauration G1 dans une base renommée : identité boutique, dossiers et événements conservés', async () => {
    await stopService(server); server = undefined; await db.stop(); db = undefined;
    const oldDatabase = session.database;
    session = await restoreSession(await backupSession(session), await makeSession('C'));
    assert.notEqual(session.database, oldDatabase);
    db = await startPostgres(session); server = await apiStart(session);
    be = apiClient(session, { channel: fixtures.channels.be.token }); await be.login();
    const dossier = (await be.query('query($id:String!){operationDossiers(id:$id)}', {id:action.id})).operationDossiers[0];
    assert.equal(dossier.action.state,'succeeded'); assert.equal(dossier.action.context.scope.shopId,session.shopId);
    assert.equal((await detail(integrated.id)).headVersion,2);
    assert.equal((await execute(action)).operations[0].attemptCount,1);
    assert.equal((await sql('SELECT action_id FROM platform_action_projection WHERE action_id=$1',[action.id])).rowCount,1);
  });
  await writeFile(path.join(session.dataDir,'ui-accounts.json'),JSON.stringify(uiAccounts),{mode:0o600});
  await mkdir(path.join(root,'.local-coordination'),{recursive:true});
  if (!process.argv.includes('--no-demo')) await writeFile(path.join(root,'.local-coordination/g1-demo.json'),JSON.stringify({sessionFile:session.file,pageId:integrated.id,actionId:action.id,productId,channelId:fixtures.channels.be.id,channelToken:fixtures.channels.be.token,apiPort:session.apiPort,dashboardPort:session.dashboardPort},null,2),{mode:0o600});
  report.status = 'passed';
} catch(error) {
  report.status='failed';report.error=secrets.reduce((s,secret)=>s.replaceAll(secret,'[REDACTED]'),String(error.stack)); console.error(report.error);
} finally {
  await stopService(worker);await stopService(server);if(db)await db.stop();
  for(const s of sessions)await assertPortsFree([s.apiPort,s.postgresPort]);
  report.finishedAt=new Date().toISOString(); report.servicesStopped=true;report.sourceSha256={};
  for(const dir of ['apps/commerce/src','apps/dashboard/src','infra/dev','infra/tests/g1']) {
    for(const entry of await readdir(path.join(root,dir),{recursive:true,withFileTypes:true})) {
      if(!entry.isFile())continue;const f=path.join(entry.parentPath,entry.name);
      report.sourceSha256[path.relative(root,f)]=createHash('sha256').update(await readFile(f)).digest('hex');
    }
  }
  await writeFile(path.join(output,'integration.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`G1 : ${report.status}, ${report.cases.filter(c=>c.status==='passed').length}/${report.cases.length}`);
}
process.exit(report.status==='passed'?0:1);
