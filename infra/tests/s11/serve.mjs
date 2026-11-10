import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { makeSession, startPostgres, startApi, stopService, client, root, childEnvironment } from './harness.mjs';

const session = await makeSession(true);
let db, api, vite;
let shuttingDown = false;
let finish;
const finished = new Promise(resolve => { finish = resolve; });
process.once('SIGTERM', finish); process.once('SIGINT', finish);
try {
  db = await startPostgres(session); api = await startApi(session);
  const admin = client(session); await admin.login();
  const pages = (await admin.query('query { contentPages { totalItems } }')).contentPages;
  if (!pages.totalItems) {
    await admin.query('mutation($input:CreateContentPageInput!) { createContentPage(input:$input) {id} }', { input: {
      slug: 'notre-histoire', languageCode: 'en', document: { title: 'Notre histoire', blocks: [
        { id: 'intro', type: 'text', text: 'Nous choisissons des objets utiles et durables, conçus pour accompagner le quotidien.' },
        { id: 'atelier', type: 'text', text: 'Chaque collection commence dans notre atelier. Nous prenons le temps de choisir les matières et de vérifier les finitions.' },
      ] },
    } });
  }
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'infra/tests/s11/vite.config.mts'], { cwd: root, env: childEnvironment(session), stdio: 'inherit' });
  api.once('exit', () => { if (!shuttingDown) { process.exitCode = 1; finish(); } });
  vite.once('exit', () => { if (!shuttingDown) { process.exitCode = 1; finish(); } });
  console.log(`Recette S11 : http://127.0.0.1:${session.dashboardPort}/dashboard/content`);
  console.log('Identifiants privés : .data/v1-s11-b/recipe.json. Arrêt : Ctrl-C.');
  await finished;
} finally {
  shuttingDown = true;
  if (vite && vite.exitCode === null) { const exited = once(vite, 'exit'); vite.kill('SIGTERM'); await exited; }
  await stopService(api); if (db) await db.stop();
}
