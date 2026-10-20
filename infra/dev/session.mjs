import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const slots = { A: 1, B: 2, C: 3 };
const missions = { S00: 'v0', S10: 'v1', S11: 'v1', S12: 'v1' };

export function sessionSlot(args = process.argv.slice(2)) {
  const slot = args.find(value => value.startsWith('--session='))?.split('=')[1] ?? 'A';
  if (!Object.hasOwn(slots, slot)) throw new Error('Session attendue : --session=A, B ou C.');
  return slot;
}

export function sessionMission(args = process.argv.slice(2)) {
  const mission = args.find(value => value.startsWith('--mission='))?.slice(10) ?? 'S00';
  if (!Object.hasOwn(missions, mission)) throw new Error('Mission attendue : S00, S10, S11 ou S12.');
  return mission;
}

export function sessionPaths(slot, base = root, mission = 'S00') {
  if (!Object.hasOwn(slots, slot)) throw new Error('Session inconnue.');
  if (!Object.hasOwn(missions, mission)) throw new Error('Mission inconnue.');
  const offset = slots[slot];
  const id = `${missions[mission]}-${mission.toLowerCase()}-${slot.toLowerCase()}`;
  const dataDir = path.join(base, '.data', id);
  return {
    id, dataDir,
    file: path.join(dataDir, 'session.json'),
    postgresDir: path.join(dataDir, 'postgres'),
    mediaDir: path.join(dataDir, 'media'),
    backupDir: path.join(dataDir, 'backups'),
    apiPort: 4100 + offset,
    dashboardPort: 5100 + offset,
    storefrontPort: 3100 + offset,
    postgresPort: 5540 + offset,
    database: id.replaceAll('-', '_'),
  };
}

export async function prepareSession(slot, base = root, mission = 'S00') {
  const config = sessionPaths(slot, base, mission);
  await mkdir(config.dataDir, { recursive: true, mode: 0o700 });
  try {
    const saved = JSON.parse(await readFile(config.file, 'utf8'));
    for (const key of Object.keys(config)) {
      if (saved[key] !== config[key]) throw new Error(`Configuration ${slot} incohérente : ${key}.`);
    }
    return saved;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const session = {
    ...config,
    databaseUser: 'ecom_dev',
    databasePassword: randomBytes(32).toString('hex'),
    adminUsername: `admin-${slot.toLowerCase()}@local.test`,
    adminPassword: randomBytes(24).toString('hex'),
    cookieSecret: randomBytes(32).toString('hex'),
  };
  await mkdir(config.mediaDir, { recursive: true, mode: 0o700 });
  await mkdir(config.backupDir, { recursive: true, mode: 0o700 });
  await writeFile(config.file, JSON.stringify(session, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  return session;
}

export async function assertPortsFree(ports) {
  const servers = [];
  try {
    for (const port of ports) {
      const server = net.createServer();
      await new Promise((resolve, reject) => {
        server.once('error', () => reject(new Error(`Port ${port} occupé ou inaccessible. Aucun processus arrêté.`)));
        server.listen(port, '127.0.0.1', resolve);
      });
      servers.push(server);
    }
  } finally {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
  }
}

export function childEnvironment(session) {
  return {
    ...process.env,
    ECOM_SESSION_FILE: session.file,
    VENDURE_DISABLE_TELEMETRY: 'true',
    NODE_ENV: 'development',
  };
}
