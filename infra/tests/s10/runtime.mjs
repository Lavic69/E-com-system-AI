import { fork } from 'node:child_process';
import net from 'node:net';
import { childEnvironment, root } from '../../dev/session.mjs';
import { stopService } from '../../dev/processes.mjs';

export async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
export async function startApi(session, options = []) {
  const child = fork('infra/tests/s10/server.cjs', options, {
    cwd: root, env: childEnvironment(session), detached: true, stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Serveur S10 indisponible après 90 secondes.')), 90000);
      const cleanup = () => { clearTimeout(timer); child.off('exit', exit); child.off('error', error); child.off('message', message); };
      const exit = code => { cleanup(); reject(new Error(`Serveur S10 arrêté : ${code}`)); };
      const error = value => { cleanup(); reject(value); };
      const message = value => { if (value.ready) { cleanup(); resolve(); } };
      child.once('exit', exit); child.once('error', error); child.on('message', message);
    });
    return child;
  } catch (error) { await stopService(child); throw error; }
}
export function apiClient(session, { channel = '', shop = false } = {}) {
  let token;
  async function request(query, variables = {}, form, signal = AbortSignal.timeout(60000)) {
    const response = await fetch(`http://127.0.0.1:${session.apiPort}/${shop ? 'shop' : 'admin'}-api`, {
      method: 'POST',
      headers: { ...(!form ? { 'content-type': 'application/json' } : { 'apollo-require-preflight': 'true' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}), ...(channel ? { 'vendure-token': channel } : {}) },
      body: form ?? JSON.stringify({ query, variables }), signal,
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
  }
  return {
    query: request,
    async login(username = session.adminUsername, password = session.adminPassword) {
      const result = await request(`mutation($username:String!,$password:String!){login(username:$username,password:$password){... on CurrentUser{id} ... on ErrorResult{errorCode}}}`, { username, password });
      if (!result.login.id) throw new Error('Authentification refusée.');
    },
    async upload() {
      const form = new FormData();
      form.set('operations', JSON.stringify({ query: 'mutation($input:[CreateAssetInput!]!){createAssets(input:$input){... on Asset{id name source preview} ... on ErrorResult{errorCode}}}', variables: { input: [{ file: null }] } }));
      form.set('map', JSON.stringify({ '0': ['variables.input.0.file'] }));
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKXcAAAAASUVORK5CYII=', 'base64');
      form.set('0', new Blob([png], { type: 'image/png' }), 's10-fixture.png');
      return request('', {}, form);
    },
  };
}
export async function createMember(admin, channelIds, code, password, permissions) {
  const { createRole } = await admin.query('mutation($input:CreateRoleInput!){createRole(input:$input){id}}', {
    input: { code, description: 'Rôle de démonstration S10', permissions, channelIds },
  });
  const email = `${code}@local.test`;
  const { createAdministrator } = await admin.query('mutation($input:CreateAdministratorInput!){createAdministrator(input:$input){id}}', {
    input: { firstName: 'Démo', lastName: code, emailAddress: email, password, roleIds: [createRole.id] },
  });
  return { email, id: createAdministrator.id, roleId: createRole.id };
}
