import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
process.env.ECOM_PROJECT_ROOT = root;
process.env.VENDURE_DISABLE_TELEMETRY = 'true';
process.env.ECOM_SESSION_FILE ??= path.join(root, '.data/v1-s12-c/session.json');
const session = JSON.parse(readFileSync(process.env.ECOM_SESSION_FILE, 'utf8'));
export default defineConfig({
  base: '/dashboard/',
  cacheDir: path.join(root, '.cache/s12-vite'),
  build: { outDir: path.join(root, '.data/v1-s12-c/dashboard'), emptyOutDir: true, reportCompressedSize: false },
  server: {
    host: '127.0.0.1',
    port: session.dashboardPort,
    strictPort: true,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.data/**', '**/.local-coordination/**'] },
  },
  plugins: [
    vendureDashboardPlugin({
      vendureConfigPath: pathToFileURL(path.join(root, 'infra/tests/s12/config-ui.ts')),
      vendureConfigExport: 'config',
      api: { host: 'http://127.0.0.1', port: session.apiPort },
      pathAdapter: { sourceRoot: root },
      gqlOutputPath: path.join(root, '.cache/s12-gql'),
      tempCompilationDir: path.join(root, '.cache/s12-vendure'),
    }),
  ],
});
