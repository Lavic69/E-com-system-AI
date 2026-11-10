import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { clientFor, createReader } from '../../dev/graphql.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.S12_PLAYWRIGHT_MODULE ?? 'playwright');
const session = JSON.parse(await readFile('.data/v1-s12-c/session.json'));
const report = { browser: 'Chromium isolé, distinct de Responsively', screens: [], states: [], errors: [] };
const dir = 'docs/livraisons/S12/preuves';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
async function login(page, username = session.adminUsername, password = session.adminPassword) {
  await page.goto(`http://127.0.0.1:${session.dashboardPort}/dashboard/operations`);
  await page.getByPlaceholder('Email', { exact: true }).fill(username);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('.ops-screen').waitFor({ timeout: 45000 });
}
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  await login(page);
  await page.locator('.ops-dossier').waitFor();
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.getByRole('button', { name: /Message de vérification/ }).click();
    assert.match(await page.locator('.ops-dossier').innerText(), /Coût connu\s+Inconnu/);
    const sizes = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      screen: document.querySelector('.ops-screen').getBoundingClientRect().width,
    }));
    assert.ok(sizes.document <= width + 1, JSON.stringify(sizes));
    await page.locator('.ops-screen').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${dir}/dashboard-${width}.png` });
    await page.getByRole('button', { name: /Présentation du produit/ }).click();
    await page.locator('.ops-evidence').waitFor();
    assert.match(await page.locator('.ops-dossier').innerText(), /2,40/);
    const summary = page.locator('.ops-dossier summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.ops-dossier details').getAttribute('open'), '');
    await page.screenshot({ path: `${dir}/proof-${width}.png` });
    await page.keyboard.press('Enter');
    report.screens.push({
      width,
      height,
      ...sizes,
      overflow: false,
      selection: true,
      keyboardDetails: true,
      knownAndUnknownCost: true,
    });
  }
  const state = await context.storageState();
  await page.route('**/admin-api**', async (route) => {
    const body = route.request().postData() ?? '';
    if (body.includes('operationDossiers')) await route.fulfill({ json: { errors: [{ message: 'UI test outage' }] } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Les dossiers' }).waitFor();
  await page.screenshot({ path: `${dir}/state-error.png` });
  report.states.push('erreur réseau simulée');
  await page.unrouteAll();
  await page.route('**/admin-api**', async (route) => {
    if ((route.request().postData() ?? '').includes('operationDossiers'))
      await route.fulfill({ json: { data: { operationDossiers: [] } } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await page.getByRole('heading', { name: 'Aucun dossier sur ce canal' }).waitFor();
  await page.screenshot({ path: `${dir}/state-empty.png` });
  report.states.push('liste vide simulée');
  const loadingContext = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
  const loadingPage = await loadingContext.newPage();
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  await loadingPage.route('**/admin-api**', async (route) => {
    if ((route.request().postData() ?? '').includes('operationDossiers')) await pending;
    await route.continue();
  });
  await loadingPage.goto(`http://127.0.0.1:${session.dashboardPort}/dashboard/operations`);
  await loadingPage.getByRole('status').filter({ hasText: 'Chargement des dossiers' }).waitFor();
  await loadingPage.screenshot({ path: `${dir}/state-loading.png` });
  release();
  await loadingPage.locator('.ops-dossier').waitFor();
  report.states.push('chargement avec réponse retardée');
  await loadingContext.close();
  const admin = clientFor(session);
  await admin.login(session.adminUsername, session.adminPassword);
  const channel = (await admin.query('query{activeChannel{id}}')).activeChannel.id;
  const password = randomBytes(24).toString('hex');
  const email = await createReader(admin, channel, `s12-ui-refusal-${Date.now()}`, password, ['ReadCatalog']);
  const refusalContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const refusalPage = await refusalContext.newPage();
  await login(refusalPage, email, password);
  await refusalPage.getByRole('alert').filter({ hasText: 'Accès refusé' }).waitFor();
  await refusalPage.screenshot({ path: `${dir}/state-forbidden.png` });
  report.states.push('refus avec compte réel sans ReadOperations');
  await refusalContext.close();
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error.message;
  throw error;
} finally {
  await writeFile(`${dir}/ui.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
