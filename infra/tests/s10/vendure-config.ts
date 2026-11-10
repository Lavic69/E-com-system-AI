import path from 'node:path';
import { VendureConfig } from '@vendure/core';
import { config as foundation } from '../../../apps/commerce/src/foundation-config';
import { CataloguePlugin } from '../../../apps/commerce/src/plugins/catalogue/catalogue.plugin';

// Composition S10 only; the shared registry will be updated by G1.
export const config: VendureConfig = {
  ...foundation,
  plugins: [...foundation.plugins!, CataloguePlugin],
  dbConnectionOptions: {
    ...foundation.dbConnectionOptions,
    migrations: [
      path.resolve(__dirname, '../../../apps/commerce/src/migrations/*-InitialSchema.ts'),
      path.resolve(__dirname, '../../../apps/commerce/src/plugins/catalogue/migrations/*.ts'),
    ],
  },
};
