import { generateMigration, runMigrations } from '@vendure/core';
import path from 'node:path';
import { config } from './vendure-config';

async function main() {
  if (process.argv.includes('--generate')) {
    await generateMigration(config, { name: 'InitialSchema', outputDir: path.join(__dirname, '../src/migrations') });
  } else {
    const migrations = await runMigrations(config);
    console.log('Migrations appliquées.', migrations ?? '');
  }
}
main().catch(error => { console.error(error.message); process.exit(1); });
