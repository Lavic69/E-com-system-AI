import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defineConfig } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
process.env.ECOM_PROJECT_ROOT = root;
process.env.VENDURE_DISABLE_TELEMETRY = 'true';
const session = JSON.parse(readFileSync(process.env.ECOM_SESSION_FILE!, 'utf8'));
export default defineConfig({
  base: '/dashboard/',
  cacheDir: path.join(root, '.cache/s11-vite'),
  build: { outDir: path.join(root, '.cache/s11-dashboard'), emptyOutDir: true, reportCompressedSize: false },
  server: {
    host: '127.0.0.1', port: session.dashboardPort, strictPort: true,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.data/**', '**/.local-coordination/**'] },
  },
  plugins: [vendureDashboardPlugin({
    vendureConfigPath: pathToFileURL(path.join(root, 'infra/tests/s11/vendure-config.ts')),
    api: { host: 'http://127.0.0.1', port: session.apiPort },
    gqlOutputPath: path.join(root, '.cache/s11-gql'),
    tempCompilationDir: path.join(root, '.cache/s11-vendure'),
  })],
});
