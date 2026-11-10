import { prepareSession, childEnvironment } from '../../dev/session.mjs';
import { startPostgres } from '../../dev/postgres.mjs';
import { command } from '../../dev/processes.mjs';

const session = await prepareSession('A', undefined, 'S10');
const database = await startPostgres(session);
try { await command(process.execPath, ['infra/tests/s10/server.cjs', '--generate'], { env: childEnvironment(session) }); }
finally { await database.stop(); }
