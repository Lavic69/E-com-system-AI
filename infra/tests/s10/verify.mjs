import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { prepareSession, root, assertPortsFree } from '../../dev/session.mjs';
import { startPostgres, databaseClient } from '../../dev/postgres.mjs';
import { stopService } from '../../dev/processes.mjs';
import { apiClient, freePort, startApi } from './runtime.mjs';
import { seed } from './fixtures.mjs';

const reportDir = path.join(root, 'docs/livraisons/S10/preuves');
await mkdir(reportDir, { recursive: true }); await mkdir(path.join(root, '.data'), { recursive: true });
const directory = await mkdtemp(path.join(root, '.data/s10-verification-'));
const session = await prepareSession('A', directory, 'S10');
session.apiPort = await freePort(); session.postgresPort = await freePort(); session.dashboardPort = await freePort();
await writeFile(session.file, JSON.stringify(session), { mode: 0o600 });
const report = { startedAt: new Date().toISOString(), base: '2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086', vendure: '3.8.0', cases: [], status: 'running' };
const secrets = [session.adminPassword, session.databasePassword, session.cookieSecret];
const sanitize = value => secrets.reduce((s, secret) => s.replaceAll(secret, '[REDACTED]'), String(value));
let database, server, worker;
async function check(name, action) {
  const item = { name, status: 'running' }; report.cases.push(item);
  try { await action(); item.status = 'passed'; console.log(`✓ ${name}`); }
  catch (error) { item.status = 'failed'; item.error = sanitize(error.message); throw error; }
}
async function sql(query, params = []) {
  const client = databaseClient(session); await client.connect();
  try { return await client.query(query, params); } finally { await client.end(); }
}
const fields = 'previewHash rows {line key name sku price stock status message productId variantId}';
const previewQuery = `query($csv:String!,$stockLocationId:ID!){previewCatalogueImport(csv:$csv,stockLocationId:$stockLocationId){${fields}}}`;
const applyQuery = `mutation($csv:String!,$stockLocationId:ID!,$previewHash:String!){applyCatalogueImport(csv:$csv,stockLocationId:$stockLocationId,previewHash:$previewHash){${fields}}}`;
const forbidden = action => assert.rejects(action, error => error.codes?.some(code => ['FORBIDDEN', 'UNAUTHORIZED'].includes(code)));
const productQuery = 'query($id:ID!){product(id:$id){id name enabled translations{languageCode name} variants{id sku price currencyCode stockLevels{stockOnHand stockLocation{id}}} }}';

try {
  await check('Migration S00 puis candidate S10 sur PostgreSQL vide', async () => {
    database = await startPostgres(session); server = await startApi(session);
    worker = await startApi(session, ['--worker']);
    assert.equal((await sql('SELECT name FROM migrations')).rowCount, 2);
    assert.equal((await sql("SELECT column_name FROM information_schema.columns WHERE table_name='customer' AND column_name LIKE 'customFields%'")).rowCount, 2);
  });
  let fixtures;
  await check('Deux marchés, trois emplacements et membres natifs avec rôles distincts', async () => { fixtures = await seed(session); secrets.push(fixtures.password); });
  const { channels, locations, usLocation } = fixtures;
  const admin = apiClient(session); await admin.login();
  const be = apiClient(session, { channel: channels.be.token }); await be.login();
  const us = apiClient(session, { channel: channels.us.token }); await us.login();
  const editor = apiClient(session, { channel: channels.be.token }); await editor.login(fixtures.editor.email, fixtures.password);
  const reader = apiClient(session, { channel: channels.be.token }); await reader.login(fixtures.reader.email, fixtures.password);
  const creator = apiClient(session, { channel: channels.be.token }); await creator.login(fixtures.creator.email, fixtures.password);
  const shop = apiClient(session, { channel: channels.be.token, shop: true });
  const shopUS = apiClient(session, { channel: channels.us.token, shop: true });
  const stockLocationId = locations[0].id;
  const preview = async (csv, client = editor, location = stockLocationId) => (await client.query(previewQuery, { csv, stockLocationId: location })).previewCatalogueImport;
  const apply = async (csv, client = editor, location = stockLocationId, hash) => (await client.query(applyQuery, {
    csv, stockLocationId: location, previewHash: hash ?? (await preview(csv, client, location)).previewHash,
  })).applyCatalogueImport;
  const csv = 'key,name,sku,price,stock\nproof-mug,"Tasse, bleue",MUG-BLUE,1290,12\nwrong,Incorrect,BAD,-12,2\n';
  let imported;
  await check('Aperçu sans écriture, prix entier et erreurs par ligne', async () => {
    const result = await preview(csv); assert.deepEqual(result.rows.map(r => r.status), ['ready', 'invalid']);
    assert.equal(result.rows[0].name, 'Tasse, bleue'); assert.equal(result.rows[0].price, 1290);
    assert.equal((await be.query('query{products{totalItems}}')).products.totalItems, 0);
  });
  await check('Import partiel : une ligne valide créée, ligne invalide ignorée', async () => {
    imported = await apply(csv); assert.deepEqual(imported.rows.map(r => r.status), ['imported', 'invalid']);
    assert.equal((await be.query('query{products{totalItems}}')).products.totalItems, 1);
  });
  const productId = imported.rows[0].productId, variantId = imported.rows[0].variantId;
  await check('Lecture visiteur : produit, variante et prix du marché Belgique', async () => {
    const { product } = await shop.query('query($id:ID!){product(id:$id){name variants{id sku price currencyCode}}}', { id: productId });
    assert.equal(product.name, 'Tasse, bleue'); assert.equal(product.variants[0].price, 1290); assert.equal(product.variants[0].currencyCode, 'EUR');
  });
  await check('Relance du même fichier et conflit si une clé change de contenu', async () => {
    assert.equal((await apply(csv)).rows[0].status, 'alreadyImported');
    assert.equal((await apply(csv.replace('1290', '990'))).rows[0].status, 'conflict');
    assert.equal((await sql('SELECT * FROM catalogue_import_receipt')).rowCount, 1);
    assert.equal((await be.query(productQuery, { id: productId })).product.variants[0].price, 1290);
  });
  await check('Aperçu invalidé par changement de fichier, marché ou emplacement', async () => {
    const hash = (await preview(csv)).previewHash;
    await assert.rejects(() => apply(csv.replace('1290', '1300'), editor, stockLocationId, hash), /aperçu/);
    await assert.rejects(() => apply(csv, editor, locations[1].id, hash), /aperçu/);
    await assert.rejects(() => apply(csv, us, usLocation.id, hash), /aperçu/);
    await assert.rejects(() => preview(csv, editor, usLocation.id), /Emplacement/);
    await admin.query('mutation($input:UpdateChannelInput!){updateChannel(input:$input){... on Channel{id}}}', { input: { id: channels.be.id, pricesIncludeTax: true } });
    try { await assert.rejects(() => apply(csv, editor, stockLocationId, hash), /aperçu/); }
    finally { await admin.query('mutation($input:UpdateChannelInput!){updateChannel(input:$input){... on Channel{id}}}', { input: { id: channels.be.id, pricesIncludeTax: false } }); }
  });
  await check('Concurrence : deux requêtes avec la même clé ne créent qu’un produit', async () => {
    const input = 'key,name,sku,price,stock\nparallel,Concurrent,PARALLEL,100,3';
    const hash = (await preview(input)).previewHash;
    const results = await Promise.all([apply(input, editor, stockLocationId, hash), apply(input, editor, stockLocationId, hash)]);
    assert.deepEqual(results.map(r => r.rows[0].status).sort(), ['alreadyImported', 'imported']);
    assert.equal((await sql('SELECT * FROM catalogue_import_receipt WHERE "rowKey"=$1', ['parallel'])).rowCount, 1);
  });
  await check('SKU concurrent avec deux clés différentes : un seul produit', async () => {
    const input = 'key,name,sku,price,stock\nkey-a,Concurrent SKU,SAME-SKU,100,3';
    const results = await Promise.all([apply(input), apply(input.replace('key-a', 'key-b'))]);
    assert.deepEqual(results.map(r => r.rows[0].status).sort(), ['conflict', 'imported']);
  });
  await check('Arrêt brutal en milieu d’import : reprise des seules lignes non validées', async () => {
    const input = 'key,name,sku,price,stock\n' + Array.from({ length: 25 }, (_, i) => `crash-${i},Crash ${i},CRASH-${i},100,1`).join('\n');
    const previewHash = (await preview(input)).previewHash;
    const pending = editor.query(applyQuery, { csv: input, stockLocationId, previewHash }).catch(error => error);
    const deadline = Date.now() + 15000;
    let completed = 0;
    while (!completed && Date.now() < deadline) {
      completed = (await sql('SELECT id FROM catalogue_import_receipt WHERE "rowKey" LIKE $1', ['crash-%'])).rowCount;
      if (!completed) await delay(10);
    }
    assert.ok(completed > 0 && completed < 25, 'Interrompre un import réellement partiel.');
    const stopped = once(server, 'exit'); server.kill('SIGKILL'); await stopped; await pending;
    server = await startApi(session); await editor.login(fixtures.editor.email, fixtures.password);
    const before = (await sql('SELECT id FROM catalogue_import_receipt WHERE "rowKey" LIKE $1', ['crash-%'])).rowCount;
    const result = await apply(input);
    assert.equal(result.rows.filter(r => r.status === 'alreadyImported').length, before);
    assert.equal(result.rows.filter(r => r.status === 'imported').length, 25 - before);
    assert.equal((await sql('SELECT id FROM product_variant WHERE sku LIKE $1', ['CRASH-%'])).rowCount, 25);
  });
  await check('Rollback après création du produit si la variante échoue, puis reprise', async () => {
    await sql(`CREATE FUNCTION s10_reject_variant() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.sku = 'ROLLBACK-S10' THEN RAISE EXCEPTION 'S10 simulated insert failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER s10_fail BEFORE INSERT ON product_variant FOR EACH ROW EXECUTE FUNCTION s10_reject_variant()`);
    const input = 'key,name,sku,price,stock\nrollback,Rollback,ROLLBACK-S10,100,1';
    const before = (await be.query('query{products{totalItems}}')).products.totalItems;
    try {
      assert.equal((await apply(input)).rows[0].status, 'failed');
      assert.equal((await be.query('query{products{totalItems}}')).products.totalItems, before);
      assert.equal((await sql('SELECT * FROM catalogue_import_receipt WHERE "rowKey"=$1', ['rollback'])).rowCount, 0);
    } finally { await sql('DROP TRIGGER s10_fail ON product_variant; DROP FUNCTION s10_reject_variant()'); }
    assert.equal((await apply(input)).rows[0].status, 'imported');
  });
  await check('Bornes et CSV malformé refusés, clés/SKU répétés signalés', async () => {
    await assert.rejects(() => preview('key,name,sku,price,stock\na,"oops,x,1,1'), /guillemet/);
    await assert.rejects(() => preview('x'.repeat(65537)), /64 Ko/);
    await assert.rejects(() => preview('key,name,sku,price,stock\n' + Array.from({ length: 101 }, (_, i) => `k${i},N,S${i},1,1`).join('\n')), /100 lignes/);
    const invalid = await preview('key,name,sku,price,stock\na,A,A,2147483648,1\na,B,A,1.2,-1');
    assert.ok(invalid.rows.every(r => r.status === 'invalid'));
    const blanks = await preview('\uFEFFkey,name,sku,price,stock\r\n\r\nquoted,"Tasse ""bleue""",QUOTED,100,1');
    assert.equal(blanks.rows[0].line, 3); assert.equal(blanks.rows[0].name, 'Tasse "bleue"');
  });
  await check('API directe refusée aux anonymes et au rôle lecture seule', async () => {
    await forbidden(() => preview(csv, apiClient(session, { channel: channels.be.token })));
    await forbidden(() => preview(csv, reader));
    await forbidden(() => apply(csv, reader, stockLocationId, 'anything'));
    assert.ok((await reader.query('query{products{totalItems}}')).products.totalItems > 0);
    await forbidden(() => reader.query('mutation{createProduct(input:{translations:[{languageCode:fr,name:"Interdit",slug:"interdit"}]}){id}}'));
    await forbidden(() => reader.query('mutation($input:UpdateProductInput!){updateProduct(input:$input){id}}', { input: { id: productId, enabled: false } }));
    await forbidden(() => reader.query('mutation($input:[UpdateProductVariantInput!]!){updateProductVariants(input:$input){id}}', { input: [{ id: variantId, price: 1 }] }));
    await forbidden(() => reader.query('query{orders{totalItems}}'));
    await forbidden(() => editor.query('query{orders{totalItems}}'));
  });
  await check('Permission native CreateProduct seule autorise l’import', async () => {
    assert.equal((await apply('key,name,sku,price,stock\ncreator,Créateur,CREATOR,100,1', creator)).rows[0].status, 'imported');
  });
  await check('Aucune lecture ni mutation du catalogue Belgique depuis États-Unis', async () => {
    assert.equal((await us.query(productQuery, { id: productId })).product, null);
    assert.equal((await shopUS.query('query($id:ID!){product(id:$id){id}}', { id: productId })).product, null);
    await assert.rejects(() => us.query('mutation($input:UpdateProductInput!){updateProduct(input:$input){id}}', { input: { id: productId, enabled: false } }));
    const readerUS = apiClient(session, { channel: channels.us.token });
    await assert.rejects(async () => { await readerUS.login(fixtures.reader.email, fixtures.password); await readerUS.query('query{products{totalItems}}'); });
  });
  await check('Même produit affecté à deux marchés : EUR 1290 et USD 1590', async () => {
    await admin.query('mutation($input:AssignProductsToChannelInput!){assignProductsToChannel(input:$input){id}}', { input: { productIds: [productId], channelId: channels.us.id } });
    await us.query('mutation($input:[UpdateProductVariantInput!]!){updateProductVariants(input:$input){id}}', { input: [{ id: variantId, price: 1590 }] });
    const query = 'query($id:ID!){product(id:$id){variants{price currencyCode}}}';
    assert.deepEqual((await shop.query(query, { id: productId })).product.variants[0], { price: 1290, currencyCode: 'EUR' });
    assert.deepEqual((await shopUS.query(query, { id: productId })).product.variants[0], { price: 1590, currencyCode: 'USD' });
  });
  await check('Modification native du produit et stocks sur deux emplacements', async () => {
    await editor.query('mutation($input:UpdateProductInput!){updateProduct(input:$input){id}}', { input: { id: productId, translations: [{ languageCode: 'fr', name: 'Tasse bleue modifiée', slug: 'tasse-bleue', description: 'Description de démonstration' }] } });
    await editor.query('mutation($input:[UpdateProductVariantInput!]!){updateProductVariants(input:$input){id}}', { input: [{ id: variantId, stockLevels: [{ stockLocationId, stockOnHand: 7 }, { stockLocationId: locations[1].id, stockOnHand: 4 }] }] });
    const { product } = await be.query(productQuery, { id: productId });
    assert.equal(product.name, 'Tasse bleue modifiée');
    for (const [id, count] of [[stockLocationId, 7], [locations[1].id, 4]]) assert.equal(product.variants[0].stockLevels.find(s => s.stockLocation.id === id).stockOnHand, count);
    assert.equal((await apply(csv)).rows[0].status, 'alreadyImported');
    assert.equal((await be.query(productQuery, { id: productId })).product.name, 'Tasse bleue modifiée');
  });
  await check('Options et variantes natives, combinaison invalide refusée', async () => {
    const { createProduct: p } = await editor.query('mutation{createProduct(input:{translations:[{languageCode:fr,name:"T-shirt démo",slug:"tshirt-demo",description:""}]}){id}}');
    const { createProductOptionGroup: group } = await editor.query('mutation{createProductOptionGroup(input:{code:"taille",translations:[{languageCode:fr,name:"Taille"}],options:[{code:"s",translations:[{languageCode:fr,name:"S"}]},{code:"m",translations:[{languageCode:fr,name:"M"}]}]}){id options{id}}}');
    await editor.query('mutation($p:ID!,$g:ID!){addOptionGroupToProduct(productId:$p,optionGroupId:$g){id}}', { p: p.id, g: group.id });
    const input = group.options.map((option, i) => ({ productId: p.id, sku: `TSHIRT-${i}`, translations: [{ languageCode: 'fr', name: `T-shirt ${i}` }], optionIds: [option.id], price: 2500, stockLevels: [{ stockLocationId, stockOnHand: 5 }] }));
    const { createProductVariants } = await editor.query('mutation($input:[CreateProductVariantInput!]!){createProductVariants(input:$input){id options{id}}}', { input });
    assert.equal(createProductVariants.length, 2);
    await assert.rejects(() => editor.query('mutation($input:[CreateProductVariantInput!]!){createProductVariants(input:$input){id}}', { input: [{ ...input[0], optionIds: ['99999999'] }] }));
  });
  await check('Média natif chargé puis relié au produit et visible en Shop API', async () => {
    const { createAssets } = await editor.upload(); assert.ok(createAssets[0].id, JSON.stringify(createAssets));
    await editor.query('mutation($input:UpdateProductInput!){updateProduct(input:$input){id}}', { input: { id: productId, assetIds: [createAssets[0].id], featuredAssetId: createAssets[0].id } });
    const { product } = await shop.query('query($id:ID!){product(id:$id){featuredAsset{id preview}}}', { id: productId });
    assert.equal(product.featuredAsset.id, createAssets[0].id);
    assert.equal((await fetch(product.featuredAsset.preview)).status, 200);
  });
  await check('Attributs/facettes, collection et sélection native de ses variantes', async () => {
    const { createFacet: facet } = await editor.query('mutation{createFacet(input:{code:"couleur",isPrivate:false,translations:[{languageCode:fr,name:"Couleur"}]}){id}}');
    const { createFacetValues: values } = await editor.query('mutation($input:[CreateFacetValueInput!]!){createFacetValues(input:$input){id}}', { input: [{ facetId: facet.id, code: 'bleu', translations: [{ languageCode: 'fr', name: 'Bleu' }] }] });
    await editor.query('mutation($input:UpdateProductInput!){updateProduct(input:$input){id}}', { input: { id: productId, facetValueIds: [values[0].id] } });
    const filters = [{ code: 'facet-value-filter', arguments: [{ name: 'facetValueIds', value: JSON.stringify([values[0].id]) }, { name: 'containsAny', value: 'false' }] }];
    const { createCollection: collection } = await editor.query('mutation($input:CreateCollectionInput!){createCollection(input:$input){id name}}', { input: { translations: [{ languageCode: 'fr', name: 'Objets bleus', slug: 'objets-bleus', description: '' }], filters } });
    const { previewCollectionVariants } = await editor.query('query($input:PreviewCollectionVariantsInput!){previewCollectionVariants(input:$input){items{id}}}', { input: { filters, inheritFilters: false } });
    assert.ok(previewCollectionVariants.items.some(v => v.id === variantId));
    assert.equal((await shop.query('query($id:ID!){collection(id:$id){name}}', { id: collection.id })).collection.name, 'Objets bleus');
    const deadline = Date.now() + 15000;
    let actual = [];
    while (Date.now() < deadline) {
      actual = (await shop.query('query($id:ID!){collection(id:$id){productVariants{items{id}}}}', { id: collection.id })).collection.productVariants.items;
      if (actual.some(v => v.id === variantId)) break;
      await delay(200);
    }
    assert.ok(actual.some(v => v.id === variantId), 'Le worker doit affecter la variante à la collection réelle.');
  });
  await check('Modification native en masse : deux produits désactivés puis réactivés', async () => {
    const products = (await be.query('query{products(options:{take:2}){items{id}}}')).products.items;
    for (const enabled of [false, true]) {
      const data = await editor.query('mutation($input:[UpdateProductInput!]!){updateProducts(input:$input){id enabled}}', { input: products.map(p => ({ id: p.id, enabled })) });
      assert.ok(data.updateProducts.every(p => p.enabled === enabled));
    }
  });
  let customerId;
  await check('Client et compte natifs, groupe et préférences sans consentement implicite', async () => {
    const customerPassword = randomBytes(24).toString('hex'); secrets.push(customerPassword);
    const { createCustomer } = await editor.query('mutation($input:CreateCustomerInput!,$password:String!){createCustomer(input:$input,password:$password){... on Customer{id user{id verified} customFields{preferredLanguage contactPreference}} ... on ErrorResult{errorCode}}}', { input: { firstName: 'Camille', lastName: 'Démo', emailAddress: 'camille-s10@local.test', customFields: { preferredLanguage: 'fr', contactPreference: 'none' } }, password: customerPassword });
    customerId = createCustomer.id; assert.ok(customerId); assert.ok(createCustomer.user.id);
    assert.equal(createCustomer.customFields.contactPreference, 'none');
    await be.query('mutation($id:ID!){verifyCustomerAccount(id:$id){... on Customer{id} ... on ErrorResult{errorCode}}}', { id: customerId });
    const customerClient = apiClient(session, { channel: channels.be.token, shop: true });
    await customerClient.login('camille-s10@local.test', customerPassword);
    assert.equal((await customerClient.query('query{activeCustomer{id}}')).activeCustomer.id, customerId);
    await assert.rejects(() => customerClient.query('query{activeCustomer{customFields{contactPreference}}}'));
    const { createCustomerGroup: group } = await editor.query('mutation($input:CreateCustomerGroupInput!){createCustomerGroup(input:$input){id}}', { input: { name: 'Clients démonstration', customerIds: [customerId] } });
    await editor.query('mutation($input:UpdateCustomerInput!){updateCustomer(input:$input){... on Customer{id}}}', { input: { id: customerId, customFields: { preferredLanguage: 'en' } } });
    const { customer } = await editor.query('query($id:ID!){customer(id:$id){groups{id} customFields{preferredLanguage contactPreference}}}', { id: customerId });
    assert.deepEqual(customer.groups.map(g => g.id), [group.id]); assert.equal(customer.customFields.preferredLanguage, 'en'); assert.equal(customer.customFields.contactPreference, 'none');
    await assert.rejects(() => editor.query('mutation($input:UpdateCustomerInput!){updateCustomer(input:$input){... on Customer{id}}}', { input: { id: customerId, customFields: { preferredLanguage: 'de' } } }));
    assert.equal((await us.query('query($id:ID!){customer(id:$id){id}}', { id: customerId })).customer, null);
    await forbidden(() => reader.query('mutation($input:UpdateCustomerInput!){updateCustomer(input:$input){... on Customer{id}}}', { input: { id: customerId, firstName: 'Interdit' } }));
  });
  await check('Redémarrage réel : migrations rejouables, produit, préférences et reçus persistants', async () => {
    await stopService(server); server = await startApi(session);
    assert.equal((await sql('SELECT * FROM migrations')).rowCount, 2);
    await be.login(); await editor.login(fixtures.editor.email, fixtures.password);
    assert.equal((await apply(csv)).rows[0].status, 'alreadyImported');
    assert.equal((await be.query(productQuery, { id: productId })).product.name, 'Tasse bleue modifiée');
    assert.equal((await be.query('query($id:ID!){customer(id:$id){customFields{preferredLanguage}}}', { id: customerId })).customer.customFields.preferredLanguage, 'en');
  });
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = sanitize(error.stack); console.error(report.error); process.exitCode = 1; }
finally {
  await stopService(worker); await stopService(server); if (database) await database.stop();
  await assertPortsFree([session.apiPort, session.postgresPort]);
  await assert.rejects(() => access(path.join(session.postgresDir, 'postmaster.pid')), { code: 'ENOENT' });
  report.finishedAt = new Date().toISOString(); report.servicesStopped = true;
  report.sourceSha256 = {};
  for (const folder of ['apps/commerce/src/plugins/catalogue', 'apps/dashboard/src/extensions/catalogue', 'infra/tests/s10']) {
    for (const entry of await readdir(path.join(root, folder), { recursive: true, withFileTypes: true })) {
      if (entry.isFile()) {
        const file = path.join(entry.parentPath, entry.name);
        report.sourceSha256[path.relative(root, file)] = createHash('sha256').update(await readFile(file)).digest('hex');
      }
    }
  }
  await writeFile(path.join(reportDir, 'integration.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Rapport S10 : ${report.status}, ${report.cases.filter(c => c.status === 'passed').length}/${report.cases.length} contrôles.`);
}
process.exit(report.status === 'passed' ? 0 : 1);
