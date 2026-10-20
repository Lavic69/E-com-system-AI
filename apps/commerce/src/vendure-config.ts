import 'reflect-metadata';
import { DefaultLogger, LogLevel, VendureConfig } from '@vendure/core';
import path from 'node:path';
import { platformPlugins } from './plugins';
import { readSession } from './runtime';

const session = readSession();
process.env.VENDURE_DISABLE_TELEMETRY = 'true';

export const config: VendureConfig = {
  apiOptions: {
    hostname: '127.0.0.1',
    port: session.apiPort,
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    csrfPrevention: true,
    cors: {
      origin: [`http://127.0.0.1:${session.dashboardPort}`, `http://127.0.0.1:${session.apiPort}`],
      credentials: true,
    },
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    superadminCredentials: {
      identifier: session.adminUsername,
      password: session.adminPassword,
    },
    cookieOptions: { secret: session.cookieSecret, name: `session-${session.id}` },
  },
  dbConnectionOptions: {
    type: 'postgres',
    host: '127.0.0.1',
    port: session.postgresPort,
    username: session.databaseUser,
    password: session.databasePassword,
    database: session.database,
    synchronize: false,
    migrations: [path.join(__dirname, 'migrations/*.{js,ts}')],
    logging: false,
  },
  logger: new DefaultLogger({ level: LogLevel.Warn }),
  paymentOptions: { paymentMethodHandlers: [] },
  plugins: platformPlugins(session),
};
