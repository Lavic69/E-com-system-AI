import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { clientFor } from './graphql.mjs';
import { prepareSession, root, sessionSlot, sessionMission } from './session.mjs';

const session = await prepareSession(sessionSlot(), root, sessionMission());
const client = clientFor(session);
await client.login(session.adminUsername, session.adminPassword);
const result = await client.query('query { platformFoundation { sessionId message } }');
assert.equal(result.platformFoundation.sessionId, session.id);
const url = `http://127.0.0.1:${session.dashboardPort}/dashboard/`;
const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
assert.equal(response.status, 200);
const html = await response.text();
assert.match(html, /id="app"/);
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => new URL(match[1], url));
assert.ok(scripts.length > 0);
for (const script of scripts) {
  assert.equal(script.origin, new URL(url).origin);
  const asset = await fetch(script, { signal: AbortSignal.timeout(30_000) });
  assert.equal(asset.status, 200);
}
const directory = path.join(root, 'docs/livraisons/S00/preuves');
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, 'demarrage.json'), JSON.stringify({
  checkedAt: new Date().toISOString(),
  session: session.id,
  status: 'passed',
  authenticatedApi: true,
  dashboardHtmlAndEntryScripts: true,
  renderedInterface: 'not_tested',
  note: 'Contrôle HTTP du serveur réel. Ne constitue pas une recette visuelle ou un parcours navigateur.',
}, null, 2) + '\n');
console.log('API authentifiée et ressources de démarrage du Dashboard disponibles. Rendu navigateur non testé.');
