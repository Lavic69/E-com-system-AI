import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { root } from '../../dev/session.mjs';
import path from 'node:path';

let meta;
try { meta = JSON.parse(await readFile(path.join(root, '.local-coordination/g1-demo.json'), 'utf8')); }
catch { throw new Error('Préparer la démonstration avec npm run test:g1.'); }
console.log(`Démonstration G1 : http://127.0.0.1:${meta.dashboardPort}/dashboard/content/${meta.pageId}`);
console.log('Identifiants privés dans le fichier session de la démonstration ; aucune valeur affichée.');
const child = spawn(process.execPath, ['infra/dev/run.mjs'], {
  cwd: root, env: { ...process.env, ECOM_SESSION_FILE: meta.sessionFile }, stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.once('exit', code => process.exit(code ?? 1));
