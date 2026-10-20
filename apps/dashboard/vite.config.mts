import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defineConfig } from 'vite';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
process.env.ECOM_PROJECT_ROOT = root;
process.env.VENDURE_DISABLE_TELEMETRY = 'true';
const session = JSON.parse(readFileSync(
  process.env.ECOM_SESSION_FILE ?? path.join(root, '.data/v0-s00-a/session.json'), 'utf8',
));

export default defineConfig({
  base: '/dashboard/',
  cacheDir: path.join(root, '.cache/vite', session.id),
  build: { outDir: path.join(directory, 'dist', session.id), emptyOutDir: true, reportCompressedSize: false },
  server: {
    host: '127.0.0.1',
    port: session.dashboardPort,
    strictPort: true,
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.data/**', '**/.local-coordination/**'],
    },
  },
  plugins: [
    vendureDashboardPlugin({
      vendureConfigPath: pathToFileURL(path.join(root, 'apps/commerce/src/vendure-config.ts')),
      api: { host: 'http://127.0.0.1', port: session.apiPort },
      gqlOutputPath: path.join(root, '.cache/gql', session.id),
      tempCompilationDir: path.join(root, '.cache/vendure', session.id),
    }),
  ],
});
