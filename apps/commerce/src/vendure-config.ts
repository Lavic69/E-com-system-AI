import { VendureConfig } from '@vendure/core';
import path from 'node:path';
import { config as foundation } from './foundation-config';
import { CataloguePlugin } from './plugins/catalogue/catalogue.plugin';
import { ContentPlugin } from './plugins/content/content.plugin';
import { OperationsPlugin } from './plugins/operations/operations.plugin';
import { ContentActionAdapter } from './plugins/platform/content-action';
import { PlatformPlugin } from './plugins/platform/platform.plugin';
import { readSession } from './runtime';

const session = readSession();
export const config: VendureConfig = {
  ...foundation,
  dbConnectionOptions: {
    ...foundation.dbConnectionOptions,
    migrations: [
      path.join(__dirname, 'migrations/*.{js,ts}'),
      path.join(__dirname, 'plugins/operations/migrations/*.{js,ts}'),
      path.join(__dirname, 'plugins/catalogue/migrations/*.{js,ts}'),
      path.join(__dirname, 'plugins/content/migrations/*.{js,ts}'),
    ],
  },
  plugins: [
    ...foundation.plugins!,
    CataloguePlugin,
    ContentPlugin,
    OperationsPlugin.init({
      shopId: session.shopId ?? `local:${session.database}`,
      policyVersion: 'g1-member-content-v1',
      markets: {},
      marketForChannel: channel => {
        const currencies = channel.availableCurrencyCodes.map(String).filter((code): code is 'EUR' | 'USD' => code === 'EUR' || code === 'USD');
        return currencies.length ? {
          marketId: `vendure-channel:${channel.id}`, languages: channel.availableLanguageCodes, currencies,
        } : undefined;
      },
      adapters: [new ContentActionAdapter()],
      transports: {},
    }),
    PlatformPlugin,
  ],
};
