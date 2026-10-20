import { readFileSync } from 'node:fs';
import path from 'node:path';

export const projectRoot = process.env.ECOM_PROJECT_ROOT ?? path.resolve(__dirname, '../../..');

export interface LocalSession {
  id: string;
  file: string;
  dataDir: string;
  mediaDir: string;
  database: string;
  apiPort: number;
  dashboardPort: number;
  postgresPort: number;
  databaseUser: string;
  databasePassword: string;
  adminUsername: string;
  adminPassword: string;
  cookieSecret: string;
}

export function readSession(): LocalSession {
  const filename = process.env.ECOM_SESSION_FILE ?? path.join(projectRoot, '.data/v0-s00-a/session.json');
  let session: LocalSession;
  try { session = JSON.parse(readFileSync(filename, 'utf8')); }
  catch { throw new Error('Session locale absente ou invalide. Exécuter npm run dev:prepare.'); }
  for (const key of ['databasePassword', 'adminPassword', 'cookieSecret'] as const) {
    if (typeof session[key] !== 'string' || session[key].length < 32) {
      throw new Error(`Secret local absent ou trop court : ${key}.`);
    }
  }
  if (!/^[a-z0-9_-]+$/.test(session.id) || !/^[a-z0-9_]+$/.test(session.database)) {
    throw new Error('Identifiant de session ou de base invalide.');
  }
  for (const port of [session.apiPort, session.dashboardPort, session.postgresPort]) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port local invalide.');
  }
  return session;
}
