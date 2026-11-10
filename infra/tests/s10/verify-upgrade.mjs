import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareSession, root, assertPortsFree } from '../../dev/session.mjs';
import { backupSession, restoreSession } from '../../dev/backup.mjs';
import { startPostgres, databaseClient } from '../../dev/postgres.mjs';
import { stopService } from '../../dev/processes.mjs';
import { apiClient, freePort, startApi } from './runtime.mjs';
import { seed } from './fixtures.mjs';

await mkdir(path.join(root, '.data'), { recursive: true });
const directory = await mkdtemp(path.join(root, '.data/s10-upgrade-'));
const report = { startedAt: new Date().toISOString(), base_sha: '2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086', status: 'running', cases: [] };
const secrets = [];
let server, database;
const sessions = [];
async function session(slot) {
  const value = await prepareSession(slot, directory, 'S10');
  value.apiPort = await freePort(); value.postgresPort = await freePort(); value.dashboardPort = await freePort();
  secrets.push(value.adminPassword, value.databasePassword, value.cookieSecret);
  await writeFile(value.file, JSON.stringify(value), { mode: 0o600 }); sessions.push(value);
  return value;
}
async function check(name, action) {
  const item = { name, status: 'running' }; report.cases.push(item);
  try { await action(); item.status = 'passed'; console.log(`✓ ${name}`); }
  catch (error) { item.status = 'failed'; throw error; }
}
async function sql(s, query) {
  const client = databaseClient(s); await client.connect();
  try { return await client.query(query); } finally { await client.end(); }
}
const productQuery = `query($id:ID!){product(id:$id){id name description featuredAsset{id preview} variants{id sku price currencyCode stockLevels{stockLocation{id} stockOnHand}}}}`;
const customerQuery = `query($id:ID!){customer(id:$id){id firstName lastName emailAddress groups{id name}}}`;
try {
  const source = await session('A'), target = await session('B');
  let fixtures, productId, customerId, beforeProduct, beforeCustomer, mediaHash;
  await check('Socle G0 seul, avec une seule migration et sans colonnes S10', async () => {
    database = await startPostgres(source); server = await startApi(source, ['--foundation']);
    assert.equal((await sql(source, 'SELECT name FROM migrations')).rowCount, 1);
    assert.equal((await sql(source, "SELECT column_name FROM information_schema.columns WHERE table_name='customer' AND column_name='customFieldsPreferredlanguage'")).rowCount, 0);
  });
  await check('G0 rempli par API : produit, prix, stock, média, client, groupe et rôle', async () => {
    fixtures = await seed(source); secrets.push(fixtures.password);
    const admin = apiClient(source, { channel: fixtures.channels.be.token }); await admin.login();
    const { createProduct } = await admin.query('mutation{createProduct(input:{translations:[{languageCode:fr,name:"Produit avant S10",slug:"avant-s10",description:"À conserver après migration"}]}){id}}');
    productId = createProduct.id;
    await admin.query('mutation($input:[CreateProductVariantInput!]!){createProductVariants(input:$input){id}}', { input: [{ productId, sku: 'G0-PRESERVE', price: 2450, translations: [{ languageCode: 'fr', name: 'Variante G0' }], stockLevels: [{ stockLocationId: fixtures.locations[0].id, stockOnHand: 8 }, { stockLocationId: fixtures.locations[1].id, stockOnHand: 3 }] }] });
    const { createAssets } = await admin.upload(); assert.ok(createAssets[0].id);
    await admin.query('mutation($input:UpdateProductInput!){updateProduct(input:$input){id}}', { input: { id: productId, assetIds: [createAssets[0].id], featuredAssetId: createAssets[0].id } });
    const { createCustomer } = await admin.query('mutation{createCustomer(input:{firstName:"Camille",lastName:"G0",emailAddress:"upgrade-g0@local.test"}){... on Customer{id}}}');
    customerId = createCustomer.id;
    await admin.query('mutation($input:CreateCustomerGroupInput!){createCustomerGroup(input:$input){id}}', { input: { name: 'Groupe G0', customerIds: [customerId] } });
    beforeProduct = (await admin.query(productQuery, { id: productId })).product;
    beforeCustomer = (await admin.query(customerQuery, { id: customerId })).customer;
    mediaHash = createHash('sha256').update(Buffer.from(await (await fetch(beforeProduct.featuredAsset.preview)).arrayBuffer())).digest('hex');
  });
  let restored;
  await check('Sauvegarde à froid du G0 rempli et restauration dans un autre répertoire', async () => {
    await stopService(server); server = undefined; await database.stop(); database = undefined;
    const archive = await backupSession(source);
    restored = await restoreSession(archive, target);
    assert.notEqual(restored.postgresDir, source.postgresDir);
  });
  await check('Migration S10 sur la copie, données et média conservés', async () => {
    database = await startPostgres(restored); server = await startApi(restored);
    assert.equal((await sql(restored, 'SELECT name FROM migrations')).rowCount, 2);
    const admin = apiClient(restored, { channel: fixtures.channels.be.token }); await admin.login();
    const after = (await admin.query(productQuery, { id: productId })).product;
    const newMediaHash = createHash('sha256').update(Buffer.from(await (await fetch(after.featuredAsset.preview)).arrayBuffer())).digest('hex');
    assert.equal(newMediaHash, mediaHash);
    // The media host follows the restored session's port, while the asset and bytes remain identical.
    beforeProduct.featuredAsset.preview = after.featuredAsset.preview;
    assert.deepEqual(after, beforeProduct);
    assert.deepEqual((await admin.query(customerQuery, { id: customerId })).customer, beforeCustomer);
    assert.deepEqual((await admin.query('query($id:ID!){customer(id:$id){customFields{preferredLanguage contactPreference}}}', { id: customerId })).customer.customFields, { preferredLanguage: null, contactPreference: null });
    await admin.query('mutation($input:UpdateCustomerInput!){updateCustomer(input:$input){... on Customer{id}}}', { input: { id: customerId, customFields: { preferredLanguage: 'fr', contactPreference: 'none' } } });
    const reader = apiClient(restored, { channel: fixtures.channels.be.token }); await reader.login(fixtures.reader.email, fixtures.password);
    assert.equal((await reader.query(productQuery, { id: productId })).product.name, 'Produit avant S10');
    await assert.rejects(() => reader.query('mutation($input:UpdateProductInput!){updateProduct(input:$input){id}}', { input: { id: productId, enabled: false } }), error => error.codes?.includes('FORBIDDEN'));
  });
  await check('Deuxième démarrage sans migration supplémentaire ni perte de préférences', async () => {
    await stopService(server); server = await startApi(restored);
    assert.equal((await sql(restored, 'SELECT name FROM migrations')).rowCount, 2);
    const admin = apiClient(restored, { channel: fixtures.channels.be.token }); await admin.login();
    assert.deepEqual((await admin.query('query($id:ID!){customer(id:$id){customFields{preferredLanguage contactPreference}}}', { id: customerId })).customer.customFields, { preferredLanguage: 'fr', contactPreference: 'none' });
  });
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = secrets.reduce((s, value) => s.replaceAll(value, '[REDACTED]'), String(error.stack)); console.error(report.error);
} finally {
  await stopService(server); if (database) await database.stop();
  for (const s of sessions) await assertPortsFree([s.apiPort, s.postgresPort]);
  report.finishedAt = new Date().toISOString(); report.servicesStopped = true; report.sourceSha256 = {};
  for (const filename of ['infra/tests/s10/server.cjs', 'infra/tests/s10/verify-upgrade.mjs', 'apps/commerce/src/plugins/catalogue/catalogue.plugin.ts', 'apps/commerce/src/plugins/catalogue/migrations/1794309752560-CatalogueS10.ts']) {
    report.sourceSha256[filename] = createHash('sha256').update(await readFile(path.join(root, filename))).digest('hex');
  }
  await writeFile(path.join(root, 'docs/livraisons/S10/preuves/upgrade.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Migration sur copie G0 remplie : ${report.status}, ${report.cases.filter(c => c.status === 'passed').length}/${report.cases.length}.`);
}
process.exit(report.status === 'passed' ? 0 : 1);
