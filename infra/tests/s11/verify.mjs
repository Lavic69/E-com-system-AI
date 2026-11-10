import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createReader } from '../../dev/graphql.mjs';
import { makeSession, startApi, startPostgres, stopService, sql, client, root } from './harness.mjs';

const report = { base_sha: '2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086', startedAt: new Date().toISOString(), cases: [], status: 'running' };
const output = path.join(root, 'docs/livraisons/S11/preuves');
await mkdir(output, { recursive: true });
const session = await makeSession();
let db, api;
const admin = client(session);
const doc = title => ({ title, blocks: [{ id: 'intro', type: 'text', text: 'Une page de démonstration.' }] });
const fields = 'id revision headVersion selectedVersion fencingToken leaseHolder expiresAt';
const detail = id => admin.query(`query($id: ID!) { contentPage(id: $id) { ${fields} title versions { version parentVersion state contentDigest document validatedAt evidenceRefs authorId } } }`, { id }).then(data => data.contentPage);
const create = (slug, document = doc(slug), who = admin) => who.query(`mutation($input: CreateContentPageInput!) { createContentPage(input: $input) { ${fields} } }`, { input: { slug, languageCode: 'en', document } }).then(data => data.createContentPage);
const acquire = (page, who = admin) => who.query(`mutation($id: ID!, $revision: Int!) { acquireContentLease(pageId: $id, expectedRevision: $revision) { ${fields} } }`, { id: page.id, revision: page.revision }).then(data => data.acquireContentLease);
const renew = page => admin.query(`mutation($id: ID!, $token: Int!) { renewContentLease(pageId: $id, fencingToken: $token) { ${fields} } }`, { id: page.id, token: page.fencingToken }).then(data => data.renewContentLease);
const release = (page, who = admin) => who.query(`mutation($id: ID!, $token: Int!) { releaseContentLease(pageId: $id, fencingToken: $token) { ${fields} } }`, { id: page.id, token: page.fencingToken }).then(data => data.releaseContentLease);
const save = (page, document = doc('Nouvelle version'), validate = true, who = admin) => who.query(`mutation($input: SaveContentVersionInput!) { saveContentVersion(input: $input) { ${fields} } }`, { input: { pageId: page.id, expectedRevision: page.revision, fencingToken: page.fencingToken, document, validate } }).then(data => data.saveContentVersion);
const select = (page, version, who = admin) => who.query(`mutation($input: SelectContentVersionInput!) { selectContentVersion(input: $input) { ${fields} } }`, { input: { pageId: page.id, expectedRevision: page.revision, fencingToken: page.fencingToken, version } }).then(data => data.selectContentVersion);
const rejected = (action, code) => assert.rejects(action, error => error.codes?.includes(code));
const forbidden = action => assert.rejects(action, error => error.codes?.some(code => ['FORBIDDEN', 'UNAUTHORIZED'].includes(code)));
async function check(name, action) {
  const item = { name, status: 'running' }; report.cases.push(item);
  try { await action(); item.status = 'passed'; console.log(`✓ ${name}`); }
  catch (error) { item.status = 'failed'; item.error = error.message; throw error; }
}
try {
  db = await startPostgres(session);
  api = await startApi(session, { baseOnly: true });
  await admin.login();
  const witness = (await admin.query('mutation { createProduct(input: {translations: [{languageCode:en, name:"Témoin G0", slug:"temoin-g0", description:"Conservé pendant la migration"}]}) {id} }')).createProduct;
  await stopService(api); api = undefined;
  api = await startApi(session);
  await admin.login();
  await check('Migration depuis G0 peuplé, produit conservé, sans synchronisation automatique', async () => {
    assert.equal((await sql(session, 'SELECT name FROM migrations')).rowCount, 2);
    assert.equal((await admin.query('query($id:ID!) { product(id:$id) {name} }', { id: witness.id })).product.name, 'Témoin G0');
  });
  let page, original, product, productVersion;
  await check('Création et relecture d’une page brouillon', async () => {
    page = await create('accueil'); original = await detail(page.id);
    assert.equal(original.versions.length, 1); assert.equal(original.versions[0].state, 'draft');
    assert.equal(original.versions[0].parentVersion, null);
    assert.equal(original.versions[0].contentDigest, `sha256:${createHash('sha256').update(JSON.stringify(doc('accueil'))).digest('hex')}`);
    assert.equal((await admin.query('query { contentPages { totalItems } }')).contentPages.totalItems, 1);
  });
  await check('Validation serveur stricte : champs inconnus, prix, blocs répétés, langue et adresse', async () => {
    for (const document of [
      { ...doc('X'), price: 10 }, { title: 'X', blocks: [{ id: 'p', type: 'product', productId: '1', stock: 5 }] },
      { title: 'X', blocks: [doc('X').blocks[0], doc('X').blocks[0]] },
      { title: '', blocks: [] }, { title: 'X', blocks: [{ id: 'x', type: 'html', html: '<script />' }] },
    ]) await rejected(() => create('invalid', document), 'INVALID_CONTENT');
    await rejected(() => create('../outside'), 'INVALID_CONTENT');
    await rejected(() => admin.query('mutation { createContentPage(input: {slug: "language", languageCode: "zz", document: {title: "X", blocks: []}}) {id} }'), 'INVALID_CONTENT');
    await rejected(() => create('accueil'), 'CONTENT_SLUG_EXISTS');
    assert.equal((await admin.query('query { contentPages { totalItems } }')).contentPages.totalItems, 1);
  });
  const channel = (await admin.query('query { activeChannel { id token } }')).activeChannel;
  const password = randomBytes(24).toString('hex');
  const editor = client(session), reader = client(session), selector = client(session);
  await editor.login(await createReader(admin, channel.id, 's11-editor', password, ['ReadContent', 'EditContent']), password);
  await reader.login(await createReader(admin, channel.id, 's11-reader', password, ['ReadContent']), password);
  await selector.login(await createReader(admin, channel.id, 's11-selector', password, ['ReadContent', 'SelectContent']), password);
  await check('Acquisitions concurrentes par deux membres : un seul détenteur', async () => {
    const results = await Promise.allSettled([acquire(page), acquire(page, editor)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.ok(results.find(r => r.status === 'rejected').reason.codes.includes('EDIT_RESERVED'));
    const winner = results[0].status === 'fulfilled' ? admin : editor;
    const leased = results.find(r => r.status === 'fulfilled').value;
    await release(leased, winner); page = await acquire(page);
  });
  await check('Réservation requise et non transférable à un autre membre', async () => {
    await rejected(() => save(page, doc('Interdit'), true, editor), 'EDIT_LEASE_LOST');
    await rejected(() => save({ ...page, fencingToken: 0 }), 'EDIT_LEASE_LOST');
  });
  await check('Deux sauvegardes simultanées : une version créée, un conflit de révision', async () => {
    const results = await Promise.allSettled([save(page, doc('Version A')), save(page, doc('Version B'))]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.ok(results.find(r => r.status === 'rejected').reason.codes.includes('TARGET_VERSION_CHANGED'));
    page = results.find(r => r.status === 'fulfilled').value;
    const current = await detail(page.id);
    assert.equal(current.versions.length, 2); assert.deepEqual(current.versions[1], original.versions[0]);
    assert.equal(current.versions[0].parentVersion, 1); assert.equal(current.versions[0].state, 'validated');
  });
  await check('Immutabilité imposée en base pour une version validée et son parent', async () => {
    await assert.rejects(() => sql(session, 'UPDATE content_revision SET document = $1 WHERE "pageId" = $2', [doc('Altéré'), page.id]), /immutable/);
    await assert.rejects(() => sql(session, 'DELETE FROM content_revision WHERE "pageId" = $1', [page.id]), /immutable/);
    assert.deepEqual((await detail(page.id)).versions[1], original.versions[0]);
    await assert.rejects(() => sql(session, `INSERT INTO content_revision
      ("pageId",version,"parentVersion",state,document,"contentDigest","themeVersion","validatedAt","evidenceRefs","authorId")
      SELECT "pageId",99,NULL,state,document,"contentDigest","themeVersion","validatedAt","evidenceRefs","authorId"
      FROM content_revision WHERE "pageId"=$1 AND version=1`, [page.id]), /check constraint/);
  });
  await check('Renouvellement : jeton croissant et ancien jeton refusé', async () => {
    const old = page; page = await renew(page);
    assert.equal(page.fencingToken, old.fencingToken + 1);
    await rejected(() => save(old), 'EDIT_LEASE_LOST');
    await rejected(() => renew(old), 'EDIT_LEASE_LOST');
    await rejected(() => release(old), 'EDIT_LEASE_LOST');
  });
  await check('Sélection pour publication : version validée, révision atomique et droits propres', async () => {
    await rejected(() => select(page, 1), 'CONTENT_NOT_VALIDATED');
    await forbidden(() => select(page, 2, editor));
    const stale = page; page = await select(page, 2);
    assert.equal(page.selectedVersion, 2);
    await rejected(() => select(stale, 2), 'TARGET_VERSION_CHANGED');
    await rejected(() => select(page, 2, selector), 'EDIT_LEASE_LOST');
    page = await save(page, doc('Brouillon suivant'), false);
    assert.equal(page.selectedVersion, 2);
  });
  await check('Expiration, reprise par un autre membre et refus de l’ancien détenteur', async () => {
    const old = page;
    await sql(session, 'UPDATE content_page SET "expiresAt" = clock_timestamp() - interval \'1 second\' WHERE id=$1', [page.id]);
    await rejected(() => save(page), 'EDIT_LEASE_LOST');
    await rejected(() => renew(page), 'EDIT_LEASE_LOST');
    const resumed = await acquire(page, editor);
    assert.ok(resumed.fencingToken > old.fencingToken);
    await rejected(() => save(old), 'EDIT_LEASE_LOST');
    await release(resumed, editor); page = await acquire(page);
  });
  await check('Références catalogue réelles, produit absent et données commerciales interdites', async () => {
    product = (await admin.query('mutation { createProduct(input: { translations: [{languageCode: en, name: "Produit de recette S11", slug: "s11-product", description: ""}] }) {id} }')).createProduct;
    page = await save(page, { title: 'Avec produit', blocks: [{ id: 'p', type: 'product', productId: product.id }] });
    productVersion = page.headVersion;
    await rejected(() => save(page, { title: 'Absent', blocks: [{ id: 'p', type: 'product', productId: '2147483647' }] }), 'CONTENT_REFERENCE_NOT_FOUND');
    await rejected(() => save(page, { title: 'Média absent', blocks: [{ id: 'm', type: 'media', assetId: '2147483647', alt: 'Image' }] }), 'CONTENT_REFERENCE_NOT_FOUND');
    const preview = (await admin.query('query($id: ID!, $v: Int!) { contentPreview(pageId: $id, version: $v) { localOnly blocks assets {id preview} } }', { id: page.id, v: page.headVersion })).contentPreview;
    assert.equal(preview.localOnly, true); assert.equal(preview.blocks[0].name, 'Produit de recette S11');
    assert.equal('price' in preview.blocks[0], false); assert.equal('stock' in preview.blocks[0], false);
  });
  await check('Lecture seule et anonyme : toutes les mutations refusées, mutation native également', async () => {
    assert.ok((await reader.query('query { contentPages { totalItems } }')).contentPages.totalItems > 0);
    for (const who of [reader, client(session)]) {
      for (const mutation of [() => create('forbidden', doc('X'), who), () => acquire(page, who),
        () => save(page, doc('X'), true, who), () => select(page, 2, who), () => release(page, who),
        () => who.query('mutation($id: ID!, $t: Int!) { renewContentLease(pageId:$id, fencingToken:$t) {id} }', { id: page.id, t: page.fencingToken })]) await forbidden(mutation);
      await forbidden(() => who.query('mutation { createProduct(input: { translations: [{languageCode: en, name: "Interdit", slug: "forbidden", description: ""}] }) {id} }'));
    }
    await forbidden(() => client(session).query('query { contentPages { totalItems } }'));
  });
  await check('Image importée via Vendure, référence persistée et aperçu servi', async () => {
    const asset = await admin.uploadImage();
    page = await save(page, { title: 'Image de recette', blocks: [{ id: 'image', type: 'media', assetId: asset.id, alt: 'Image de test S11' }] });
    const preview = (await admin.query('query($id:ID!, $v:Int!) { contentPreview(pageId:$id, version:$v) { blocks assets {id preview} } }', { id: page.id, v: page.headVersion })).contentPreview;
    assert.equal(preview.assets[0].id, asset.id);
    assert.equal(preview.blocks[0].alt, 'Image de test S11');
    const response = await fetch(preview.assets[0].preview);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /image\//);
  });
  await check('Canaux distincts : lecture, écriture et références hors canal refusées', async () => {
    const zone = (await admin.query('mutation { createZone(input: {name: "Zone de recette S11"}) {id} }')).createZone;
    const otherChannel = (await admin.query('mutation($input: CreateChannelInput!) { createChannel(input:$input) { ... on Channel {id token} ... on ErrorResult {message} } }', { input: { code: 's11-other', token: 's11-other', defaultLanguageCode: 'en', defaultCurrencyCode: 'EUR', pricesIncludeTax: false, defaultTaxZoneId: zone.id, defaultShippingZoneId: zone.id } })).createChannel;
    assert.ok(otherChannel.id);
    const other = client(session, otherChannel.token); await other.login();
    await rejected(() => other.query('query($id: ID!) { contentPage(id:$id) { id } }', { id: page.id }), 'CONTENT_NOT_FOUND');
    await rejected(() => save(page, doc('Hors canal'), true, other), 'CONTENT_NOT_FOUND');
    await rejected(() => create('cross-product', { title: 'X', blocks: [{ id: 'p', type: 'product', productId: product.id }] }, other), 'CONTENT_REFERENCE_NOT_FOUND');
    const outsider = client(session, otherChannel.token); await outsider.login('s11-reader@local.test', password);
    await forbidden(() => outsider.query('query { contentPages { totalItems } }'));
    await create('accueil', doc('Autre canal'), other);
    assert.equal((await other.query('query { contentPages { totalItems } }')).contentPages.totalItems, 1);
  });
  await check('Protection d’expérience de recette : lecture permise, écriture et sélection bloquées après expiration', async () => {
    const before = await detail(page.id);
    await sql(session, 'INSERT INTO s11_fixture_protection VALUES ($1, true)', [page.id]);
    await rejected(() => save(page), 'EDIT_RESERVED');
    await rejected(() => select(page, 2), 'EDIT_RESERVED');
    await rejected(() => renew(page), 'EDIT_RESERVED');
    await sql(session, 'UPDATE content_page SET "expiresAt" = clock_timestamp() - interval \'1 second\' WHERE id=$1', [page.id]);
    await rejected(() => acquire(page), 'EDIT_RESERVED');
    const after = await detail(page.id);
    assert.deepEqual(after.versions, before.versions); assert.equal(after.selectedVersion, before.selectedVersion); assert.equal(after.revision, before.revision);
    await sql(session, 'UPDATE s11_fixture_protection SET active = false WHERE page_id=$1', [page.id]);
    page = await acquire(page);
  });
  await check('Produit supprimé : aperçu explicite et sélection refusée sans changer l’historique', async () => {
    const before = await detail(page.id);
    const deleted = await admin.query('mutation($id:ID!) { deleteProduct(id:$id) { result message } }', { id: product.id });
    assert.equal(deleted.deleteProduct.result, 'DELETED');
    const preview = (await admin.query('query($id:ID!, $v:Int!) { contentPreview(pageId:$id, version:$v) {blocks} }', { id: page.id, v: productVersion })).contentPreview;
    assert.equal(preview.blocks[0].missing, true);
    await rejected(() => select(page, productVersion), 'CONTENT_REFERENCE_NOT_FOUND');
    assert.deepEqual((await detail(page.id)).versions, before.versions);
    assert.equal((await detail(page.id)).selectedVersion, before.selectedVersion);
  });
  await check('Registre de protection indisponible : transaction refusée sans version supplémentaire', async () => {
    const before = await detail(page.id);
    await sql(session, 'ALTER TABLE s11_fixture_protection RENAME TO s11_fixture_protection_unavailable');
    try { await assert.rejects(() => save(page)); }
    finally { await sql(session, 'ALTER TABLE s11_fixture_protection_unavailable RENAME TO s11_fixture_protection'); }
    assert.deepEqual(await detail(page.id), before);
  });
  await check('Journal durable des acquisitions, renouvellement et libérations', async () => {
    const events = (await sql(session, 'SELECT kind, "fencingToken" FROM content_lease_event WHERE "pageId"=$1 ORDER BY id', [page.id])).rows;
    for (const kind of ['acquired', 'renewed', 'released']) assert.ok(events.some(event => event.kind === kind));
    assert.ok(events.every((event, index) => !index || event.fencingToken >= events[index - 1].fencingToken));
  });
  await check('Redémarrage API et PostgreSQL : versions, sélection et jetons conservés, migration idempotente', async () => {
    const before = await detail(page.id);
    await stopService(api); api = undefined; await db.stop(); db = undefined;
    db = await startPostgres(session); api = await startApi(session); await admin.login();
    assert.deepEqual(await detail(page.id), before);
    assert.equal((await sql(session, 'SELECT name FROM migrations')).rowCount, 2);
  });
  report.status = 'passed';
} catch (error) { report.status = 'failed'; console.error(error); process.exitCode = 1; }
finally {
  await stopService(api); if (db) await db.stop();
  report.finishedAt = new Date().toISOString();
  report.sources = {};
  for (const folder of ['apps/commerce/src/plugins/content', 'apps/dashboard/src/extensions/content', 'infra/tests/s11']) {
    for (const item of await readdir(path.join(root, folder), { recursive: true, withFileTypes: true })) {
      if (item.isFile()) { const file = path.join(item.parentPath, item.name); report.sources[path.relative(root, file)] = createHash('sha256').update(await readFile(file)).digest('hex'); }
    }
  }
  await writeFile(path.join(output, 'integration.json'), JSON.stringify(report, null, 2) + '\n');
  if (report.status !== 'passed') process.exitCode = 1;
}
