import { fork } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { prepareSession, root, childEnvironment, assertPortsFree } from '../../dev/session.mjs';
import { startPostgres, databaseClient } from '../../dev/postgres.mjs';
import { stopService } from '../../dev/processes.mjs';

export async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
export async function makeSession(persistent = false) {
  await mkdir(path.join(root, '.data'), { recursive: true });
  const base = persistent ? root : await mkdtemp(path.join(root, '.data/s11-test-'));
  const session = { ...await prepareSession('B', base, 'S11') };
  session.file = path.join(session.dataDir, 'recipe.json');
  session.dashboardPort = persistent ? 5112 : await freePort();
  if (!persistent) { session.apiPort = await freePort(); session.postgresPort = await freePort(); }
  await assertPortsFree([session.dashboardPort, session.apiPort, session.postgresPort]);
  await writeFile(session.file, JSON.stringify(session), { mode: 0o600 });
  return session;
}
export async function startApi(session, { baseOnly = false } = {}) {
  const child = fork('infra/tests/s11/server.cjs', [], { cwd: root, env: { ...childEnvironment(session), S11_BASE_ONLY: String(baseOnly) }, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('API S11 indisponible après 60 secondes.')), 60000);
      const finish = error => { clearTimeout(timer); child.off('message', ready); child.off('exit', exit); child.off('error', finish); error ? reject(error) : resolve(); };
      const ready = message => { if (message.ready) finish(); };
      const exit = code => finish(new Error(`API S11 arrêtée : ${code}`));
      child.on('message', ready); child.once('exit', exit); child.once('error', finish);
    });
    return child;
  } catch (error) { await stopService(child); throw error; }
}
export async function sql(session, query, values = []) {
  const client = databaseClient(session);
  await client.connect();
  try { return await client.query(query, values); } finally { await client.end(); }
}
export function client(session, channelToken) {
  let token;
  return {
    async query(query, variables = {}) {
      const response = await fetch(`http://127.0.0.1:${session.apiPort}/admin-api`, {
        method: 'POST', headers: { 'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}), ...(channelToken ? { 'vendure-token': channelToken } : {}) },
        body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(15000),
      });
      token = response.headers.get('vendure-auth-token') ?? token;
      const body = await response.json();
      if (body.errors?.length) {
        const error = new Error(body.errors.map(item => item.message).join('; '));
        error.codes = body.errors.map(item => item.extensions?.code);
        throw error;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return body.data;
    },
    async login(username = session.adminUsername, password = session.adminPassword) {
      const result = await this.query('mutation($u: String!, $p: String!) { login(username: $u, password: $p) { ... on CurrentUser { id } } }', { u: username, p: password });
      if (!result.login.id) throw new Error('Connexion de recette refusée.');
    },
    async uploadImage() {
      const form = new FormData();
      form.set('operations', JSON.stringify({ query: 'mutation($input:[CreateAssetInput!]!) { createAssets(input:$input) { ... on Asset {id preview} ... on ErrorResult {message} } }', variables: { input: [{ file: null }] } }));
      form.set('map', JSON.stringify({ 0: ['variables.input.0.file'] }));
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
      form.set('0', new Blob([png], { type: 'image/png' }), 's11-image.png');
      const response = await fetch(`http://127.0.0.1:${session.apiPort}/admin-api`, {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'apollo-require-preflight': 'true', ...(channelToken ? { 'vendure-token': channelToken } : {}) }, body: form,
      });
      const body = await response.json();
      if (body.errors?.length || !body.data?.createAssets?.[0]?.id) throw new Error('Import du média de recette refusé : ' + JSON.stringify(body.errors ?? body.data));
      return body.data.createAssets[0];
    },
  };
}
export { root, startPostgres, stopService, childEnvironment };
