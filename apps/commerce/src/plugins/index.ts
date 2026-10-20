import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DefaultJobQueuePlugin, DefaultSearchPlugin } from '@vendure/core';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import path from 'node:path';
import { LocalSession, projectRoot } from '../runtime';
import { FoundationPlugin } from './foundation/foundation.plugin';

// Point de raccordement commun, géré par l'intégrateur.
export function platformPlugins(session: LocalSession) {
  return [
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: session.mediaDir,
      assetUrlPrefix: `http://127.0.0.1:${session.apiPort}/assets/`,
    }),
    DashboardPlugin.init({
      route: 'dashboard',
      appDir: path.join(projectRoot, 'apps/dashboard/dist', session.id),
      viteDevServerPort: session.dashboardPort,
    }),
    FoundationPlugin,
  ];
}
