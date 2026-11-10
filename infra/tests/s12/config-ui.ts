import { config as base } from '../../../apps/commerce/src/foundation-config';
import { OperationsPlugin } from '../../../apps/commerce/src/plugins/operations/operations.plugin';
import type { VendureConfig } from '@vendure/core';

// Dashboard introspection only. The running API uses config.cjs and its durable fixtures.
export const config: VendureConfig = {
  ...base,
  plugins: [
    ...base.plugins,
    OperationsPlugin.init({
      shopId: 's12-local-test',
      policyVersion: 's12-policy-1',
      markets: {},
      transports: {},
      adapters: [
        {
          kind: 's12-fixture',
          capability: 'email.test',
          permission: 'ApplyOperations',
          mode: 'external',
          prepare: async () => {
            throw new Error('INTROSPECTION_ONLY');
          },
        },
      ],
    }),
  ],
};
