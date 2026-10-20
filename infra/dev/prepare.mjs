import { prepareSession, sessionSlot, sessionMission, root } from './session.mjs';

const session = await prepareSession(sessionSlot(), root, sessionMission());
console.log(`Session ${session.id} préparée.`);
console.log(`API 127.0.0.1:${session.apiPort}, administration 127.0.0.1:${session.dashboardPort}, PostgreSQL 127.0.0.1:${session.postgresPort}.`);
console.log(`Identifiants conservés dans ${session.file} (fichier local ignoré par Git).`);
