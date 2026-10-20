import { access, cp, mkdir, open, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertPortsFree, prepareSession, sessionSlot, sessionMission, root } from './session.mjs';
import { databaseClient, startPostgres } from './postgres.mjs';

async function absent(filename) {
  try { await access(filename); return false; }
  catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}

async function withStoppedSession(session, operation) {
  const filename = path.join(session.dataDir, 'running.lock');
  const lock = await open(filename, 'wx');
  try {
    await assertPortsFree([session.apiPort, session.postgresPort, session.dashboardPort]);
    if (!await absent(path.join(session.postgresDir, 'postmaster.pid'))) {
      throw new Error('PostgreSQL doit être arrêté proprement avant cette opération.');
    }
    return await operation();
  } finally { await lock.close(); await unlink(filename); }
}

export async function backupSession(session) {
  return withStoppedSession(session, async () => {
    await access(path.join(session.postgresDir, 'PG_VERSION'));
    const destination = path.join(session.backupDir, new Date().toISOString().replaceAll(':', '-'));
    await mkdir(destination, { recursive: true, mode: 0o700 });
    await cp(session.postgresDir, path.join(destination, 'postgres'), { recursive: true, errorOnExist: true, force: false });
    await cp(session.mediaDir, path.join(destination, 'media'), { recursive: true, errorOnExist: true, force: false });
    await writeFile(path.join(destination, 'session.json'), JSON.stringify(session, null, 2), { mode: 0o600, flag: 'wx' });
    await writeFile(path.join(destination, 'manifest.json'), JSON.stringify({
      format: 1,
      method: 'offline-physical-copy',
      embeddedPostgres: '18.4.0-beta.17',
      platform: process.platform,
      architecture: process.arch,
      createdAt: new Date().toISOString(),
    }, null, 2), { flag: 'wx' });
    return destination;
  });
}

export async function restoreSession(archive, target) {
  return withStoppedSession(target, async () => {
    if (!await absent(target.postgresDir) || (await readdir(target.mediaDir)).length) {
      throw new Error('La destination contient déjà des données. Restauration refusée sans écrasement.');
    }
    const manifest = JSON.parse(await readFile(path.join(archive, 'manifest.json'), 'utf8'));
    if (manifest.format !== 1 || manifest.embeddedPostgres !== '18.4.0-beta.17' ||
        manifest.platform !== process.platform || manifest.architecture !== process.arch) {
      throw new Error('Sauvegarde physique incompatible avec cet environnement.');
    }
    const source = JSON.parse(await readFile(path.join(archive, 'session.json'), 'utf8'));
    if (!/^[a-z0-9_]+$/.test(source.database)) throw new Error('Nom de base archivée invalide.');
    if (!await absent(path.join(archive, 'postgres/postmaster.pid'))) throw new Error('Sauvegarde non arrêtée proprement.');
    const restored = {
      ...target,
      databaseUser: source.databaseUser,
      databasePassword: source.databasePassword,
      adminUsername: source.adminUsername,
      adminPassword: source.adminPassword,
      cookieSecret: source.cookieSecret,
    };
    await cp(path.join(archive, 'postgres'), restored.postgresDir, { recursive: true, force: false, errorOnExist: true });
    for (const name of await readdir(path.join(archive, 'media'))) {
      await cp(path.join(archive, 'media', name), path.join(restored.mediaDir, name), {
        recursive: true, force: false, errorOnExist: true,
      });
    }
    // Le cluster copié garde ses comptes ; seul le nom de la base change pour la destination.
    const postgres = await startPostgres({ ...restored, database: source.database });
    try {
      if (source.database !== restored.database) {
        const client = databaseClient(restored, 'postgres');
        await client.connect();
        try { await client.query(`ALTER DATABASE "${source.database}" RENAME TO "${restored.database}"`); }
        finally { await client.end(); }
      }
    } finally { await postgres.stop(); }
    await writeFile(restored.file, JSON.stringify(restored, null, 2) + '\n', { mode: 0o600 });
    return restored;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const session = await prepareSession(sessionSlot(), root, sessionMission());
    if (process.argv.includes('--restore')) {
      const source = process.argv.find(value => value.startsWith('--from='))?.slice(7);
      if (!source) throw new Error('Indiquer --from=/chemin/de/la/sauvegarde.');
      await restoreSession(path.resolve(source), session);
      console.log(`Restauration vérifiée et arrêtée dans ${session.id}.`);
    } else {
      console.log(`Sauvegarde locale : ${await backupSession(session)}`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  process.exit(process.exitCode ?? 0);
}
