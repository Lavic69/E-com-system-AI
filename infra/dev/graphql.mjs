export function clientFor(session) {
  let token;
  return {
    async query(query, variables = {}) {
      const response = await fetch(`http://127.0.0.1:${session.apiPort}/admin-api`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(15_000),
      });
      token = response.headers.get('vendure-auth-token') ?? token;
      const body = await response.json();
      if (body.errors?.length) {
        const error = new Error(body.errors.map(item => item.message).join('; '));
        error.codes = body.errors.map(item => item.extensions?.code);
        throw error;
      }
      if (!response.ok) throw new Error(`API HTTP ${response.status}`);
      return body.data;
    },
    async login(username, password) {
      const data = await this.query(`mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          ... on CurrentUser { id identifier }
          ... on ErrorResult { errorCode message }
        }
      }`, { username, password });
      if (!data.login.id) throw new Error('Authentification locale refusée.');
    },
  };
}

export async function createReader(admin, channelId, code, password, permissions) {
  const role = await admin.query(`mutation Role($input: CreateRoleInput!) {
    createRole(input: $input) { id }
  }`, { input: { code, description: 'Rôle de démonstration S00', permissions, channelIds: [channelId] } });
  const email = `${code}@local.test`;
  await admin.query(`mutation Member($input: CreateAdministratorInput!) {
    createAdministrator(input: $input) { id }
  }`, { input: { firstName: 'Démonstration', lastName: code, emailAddress: email, password, roleIds: [role.createRole.id] } });
  return email;
}
