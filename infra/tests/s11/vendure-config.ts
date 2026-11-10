import path from 'node:path';
import { config as base } from '../../../apps/commerce/src/foundation-config';
import { ContentPlugin } from '../../../apps/commerce/src/plugins/content/content.plugin';
import { ContentPages1794355200000 } from '../../../apps/commerce/src/plugins/content/migrations/1794355200000-ContentPages';
import { TransactionalConnection, VendureConfig } from '@vendure/core';
import { fail } from '../../../apps/commerce/src/plugins/content/document';

// Only this isolated recipe installs the protected-experiment fixture.
let fixtureConnection: TransactionalConnection | undefined;
export const bindFixtureConnection = (connection: TransactionalConnection) => { fixtureConnection = connection; };
export const config: VendureConfig = {
  ...base,
  dbConnectionOptions: {
    ...base.dbConnectionOptions,
    migrations: [path.resolve(__dirname, '../../../apps/commerce/dist/migrations/*-InitialSchema.js'), ContentPages1794355200000],
  },
  plugins: [...(base.plugins ?? []), ContentPlugin.init({ protection: {
    async assertEditable(ctx, page) {
      if (!fixtureConnection) fail('PROTECTION_UNAVAILABLE', 'Registre de recette indisponible.');
      const rows = await fixtureConnection.getRepository(ctx, page.constructor).query(
        'SELECT active FROM s11_fixture_protection WHERE page_id = $1', [page.id],
      );
      if (rows.some((row: { active: boolean }) => row.active)) fail('EDIT_RESERVED', 'Cette page est protégée par une expérience de recette.');
    },
  } })],
};
