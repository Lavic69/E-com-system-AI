import { access } from 'node:fs/promises';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

export function databaseClient(session, database = session.database) {
  return new pg.Client({
    host: '127.0.0.1', port: session.postgresPort, database,
    user: session.databaseUser, password: session.databasePassword,
  });
}

export async function startPostgres(session) {
  const postgres = new EmbeddedPostgres({
    databaseDir: session.postgresDir,
    user: session.databaseUser,
    password: session.databasePassword,
    port: session.postgresPort,
    persistent: true,
    authMethod: 'scram-sha-256',
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    postgresFlags: ['-h', '127.0.0.1', '-k', '/tmp'],
    onLog: () => {},
    onError: () => {},
  });
  let initialized = false;
  try { await access(path.join(session.postgresDir, 'PG_VERSION')); initialized = true; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!initialized) await postgres.initialise();
  await postgres.start();
  try {
    const client = databaseClient(session, 'postgres');
    await client.connect();
    try {
      const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [session.database]);
      if (!result.rowCount) {
        if (!/^[a-z0-9_]+$/.test(session.database)) throw new Error('Nom de base invalide.');
        await client.query(`CREATE DATABASE "${session.database}"`);
      }
    } finally { await client.end(); }
  } catch (error) {
    await postgres.stop();
    throw error;
  }
  return postgres;
}
