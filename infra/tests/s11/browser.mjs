import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { client, sql } from './harness.mjs';
import { createReader } from '../../dev/graphql.mjs';

// Playwright is a local verification tool, not an application dependency.
const session = JSON.parse(await readFile('.data/v1-s11-b/recipe.json', 'utf8'));
const base = `http://127.0.0.1:${session.dashboardPort}`;
const dir = 'docs/livraisons/S11/preuves/ui';
await mkdir(dir, { recursive: true });
const report = { startedAt: new Date().toISOString(), cases: [], browser: 'Chromium isolated', status: 'running' };
const browser = await chromium.launch({ headless: true });
const errors = [];
async function check(name, action) {
  await action(); report.cases.push(name); console.log(`✓ ${name}`);
}
async function login(page, username = session.adminUsername, password = session.adminPassword) {
  await page.goto(`${base}/dashboard/content`);
  await page.getByPlaceholder('Email', { exact: true }).fill(username);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Préparer les pages de la boutique' }).waitFor();
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  const slug = `recette-clavier-${Date.now()}`;
  let id;
  await check('Création d’un brouillon depuis le Dashboard', async () => {
    await page.getByRole('button', { name: 'Créer une page', exact: true }).click();
    await page.getByLabel('Titre', { exact: true }).fill('Notre atelier');
    await page.getByLabel('Adresse de la page').fill(slug);
    await page.getByRole('button', { name: 'Créer le brouillon', exact: true }).click();
    await page.getByRole('button', { name: 'Réserver l’édition', exact: true }).waitFor();
    id = page.url().split('/').pop();
    assert.match(id, /^\d+$/);
  });
  await check('Réservation au clavier et création d’une version validée', async () => {
    const reserve = page.getByRole('button', { name: 'Réserver l’édition', exact: true });
    await reserve.focus(); await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Votre réservation est active' }).waitFor();
    await page.getByRole('button', { name: 'Ajouter un texte', exact: true }).click();
    await page.getByLabel('Texte du bloc 1').fill('Nos objets prennent forme dans notre atelier. Chaque pièce est vérifiée avant de rejoindre la boutique.');
    await page.getByRole('button', { name: 'Enregistrer et valider', exact: true }).click();
    await page.getByText('Version v2 enregistrée et validée.', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Comparer la version v2', exact: true }).waitFor();
    assert.equal(await page.getByText(/Saisie non enregistrée/).count(), 0);
  });
  await check('Sélection distincte de la publication et historique consultable', async () => {
    await page.getByRole('button', { name: 'Sélectionner v2 pour publication', exact: true }).click();
    await page.getByText('Version v2 sélectionnée. Elle n’est pas publiée.', { exact: true }).waitFor();
    await page.getByRole('button', { name: /v1 · Brouillon/ }).click();
    await page.getByRole('heading', { name: 'Comparer la version v1', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Sélectionner v1 pour publication', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: /v2 · Validée/ }).click();
  });
  await check('Quatre dimensions : contenu sans débordement horizontal et captures', async () => {
    for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [360, 800]]) {
      await page.setViewportSize({ width, height });
      await page.locator('.content-workspace').waitFor();
      await page.getByRole('heading', { name: 'Votre réservation est active' }).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Débordement à ${width}`);
      await page.getByRole('heading', { name: 'Dossier de page', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${dir}/chromium-${width}x${height}.png`, animations: 'disabled' });
    }
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await check('Un second onglet ne prend pas la réservation active', async () => {
    const second = await context.newPage();
    await second.goto(`${base}/dashboard/content/${id}`);
    await second.getByRole('button', { name: 'Réserver l’édition', exact: true }).click();
    await second.getByText('Cette page est réservée par un autre éditeur ou protégée par une expérience. Vous pouvez consulter ses versions.').waitFor();
    await second.screenshot({ path: `${dir}/reservation-refusee.png`, fullPage: true });
    await second.close();
  });
  const api = client(session); await api.login();
  await check('Conflit après reprise : saisie conservée, ancienne base bloquée, reprise explicite', async () => {
    await page.getByLabel('Texte du bloc 1').fill('Saisie locale à préserver en cas de conflit.');
    await sql(session, 'UPDATE content_page SET "expiresAt"=clock_timestamp()-interval \'1 second\' WHERE id=$1', [id]);
    const record = (await api.query('query($id:ID!) { contentPage(id:$id) {revision} }', { id })).contentPage;
    const lease = (await api.query('mutation($id:ID!, $r:Int!) { acquireContentLease(pageId:$id, expectedRevision:$r) {fencingToken} }', { id, r: record.revision })).acquireContentLease;
    await api.query('mutation($input:SaveContentVersionInput!) { saveContentVersion(input:$input) {id} }', { input: { pageId: id, expectedRevision: record.revision, fencingToken: lease.fencingToken, validate: true, document: { title: 'Version d’un autre éditeur', blocks: [{ id: 'other', type: 'text', text: 'Modification concurrente enregistrée.' }] } } });
    await page.getByRole('button', { name: 'Enregistrer et valider', exact: true }).click();
    await page.getByText('La page a changé. Votre saisie est conservée. Rechargez la version actuelle avant de la reprendre.').waitFor();
    assert.equal(await page.getByLabel('Texte du bloc 1').inputValue(), 'Saisie locale à préserver en cas de conflit.');
    await page.getByRole('button', { name: 'Recharger l’historique', exact: true }).click();
    await page.getByText('Votre saisie repose sur une ancienne révision. Comparez-la avec l’historique avant de reprendre.').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Enregistrer et valider', exact: true }).isDisabled(), true);
    await page.screenshot({ path: `${dir}/conflit-saisie-conservee.png`, fullPage: true });
    page.once('dialog', dialog => void dialog.accept());
    await page.getByRole('button', { name: 'Reprendre la dernière version', exact: true }).click();
    assert.equal(await page.getByLabel('Titre de la page', { exact: true }).inputValue(), 'Version d’un autre éditeur');
    await api.query('mutation($id:ID!, $t:Int!) { releaseContentLease(pageId:$id, fencingToken:$t) {id} }', { id, t: lease.fencingToken });
  });
  await check('Lecture seule rendue avec historique et sans bouton de réservation', async () => {
    const channel = (await api.query('query { activeChannel {id} }')).activeChannel;
    const email = await createReader(api, channel.id, `s11-ui-reader-${Date.now()}`, session.adminPassword, ['ReadContent']);
    const readContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const readPage = await readContext.newPage();
    await login(readPage, email, session.adminPassword);
    await readPage.goto(`${base}/dashboard/content/${id}`);
    await readPage.getByRole('heading', { name: 'Consultation en lecture seule' }).waitFor();
    assert.equal(await readPage.getByRole('button', { name: 'Réserver l’édition', exact: true }).count(), 0);
    assert.equal(await readPage.getByLabel('Titre de la page', { exact: true }).isDisabled(), true);
    await readPage.screenshot({ path: `${dir}/lecture-seule-mobile.png`, fullPage: true });
    await readContext.close();
  });
  assert.deepEqual(errors, []);
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.message; console.error(error.message); process.exitCode = 1; }
finally {
  await browser.close(); report.finishedAt = new Date().toISOString();
  await writeFile(`${dir}/browser.json`, JSON.stringify(report, null, 2) + '\n');
}
