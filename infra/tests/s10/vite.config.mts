import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defineConfig } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
process.env.ECOM_PROJECT_ROOT = root;
process.env.VENDURE_DISABLE_TELEMETRY = 'true';
const session = JSON.parse(readFileSync(process.env.ECOM_SESSION_FILE ?? path.join(root, '.data/v1-s10-a/session.json'), 'utf8'));

export default defineConfig({
  root: path.join(root, 'apps/dashboard'), base: '/dashboard/',
  cacheDir: path.join(root, '.cache/s10/vite'),
  build: { outDir: path.join(root, 'apps/dashboard/dist', session.id), emptyOutDir: true, reportCompressedSize: false },
  server: { host: '127.0.0.1', port: session.dashboardPort, strictPort: true,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.data/**', '**/.local-coordination/**'] } },
  plugins: [vendureDashboardPlugin({
    vendureConfigPath: pathToFileURL(path.join(root, 'infra/tests/s10/vendure-config.ts')),
    api: { host: 'http://127.0.0.1', port: session.apiPort },
    gqlOutputPath: path.join(root, '.cache/s10/gql'),
    tempCompilationDir: path.join(root, '.cache/s10/vendure'),
  })],
});
