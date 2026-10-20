process.env.VENDURE_DISABLE_TELEMETRY = 'true';
require('reflect-metadata');

const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const { mkdtemp, mkdir, readFile, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { setTimeout: delay } = require('node:timers/promises');
const {
  bootstrap, mergeConfig, dummyPaymentHandler, EventBus, OrderPlacedEvent,
  PaymentStateTransitionEvent, TransactionalConnection,
} = require('@vendure/core');
const { populateInitialData } = require('@vendure/core/cli');
const { SimpleGraphQLClient, testConfig } = require('@vendure/testing');
const gql = require('graphql-tag');
const { ProbePlugin, readProbe } = require('./probe-plugin.cjs');
const { createStockEligibilityChecker } = require('../src/stock-eligibility.cjs');

const root = path.resolve(__dirname, '..');
const usePostgres = process.argv.includes('--postgres');
const guardStock = process.argv.includes('--guard-stock');
const gatewayCalls = [];
const nativeCreatePayment = dummyPaymentHandler.createPayment.bind(dummyPaymentHandler);
dummyPaymentHandler.createPayment = async (...args) => {
  gatewayCalls.push({ orderCode: args[1].code });
  if (args[4]?.validationDelayMs) await delay(args[4].validationDelayMs);
  return nativeCreatePayment(...args);
};
const secrets = [];
const newPassword = () => {
  const value = randomBytes(24).toString('hex');
  secrets.push(value);
  return value;
};
const sanitize = value => secrets.reduce((s, secret) => s.replaceAll(secret, '[REDACTED]'), String(value));
const caseNames = [
  'API administration sans authentification',
  'Catalogue créé et relu par les API',
  'Lecture autorisée et écriture interdite',
  'Permission propre à une extension',
  'Achat avec total calculé indépendamment',
  'Paiement refusé sans commande payée',
  'Nouvelle tentative après refus',
  'Demande de paiement répétée',
  'Prévention de vente au-delà du stock',
  'Remboursement partiel et confirmation',
  'Rejet du remboursement excessif',
  'Événements rapprochés des commandes',
  'Persistance après redémarrage',
  ...(usePostgres ? [
    'Deux achats simultanés sur la dernière unité',
    'Deux achats simultanés avec stock suffisant',
  ] : []),
];
const report = {
  startedAt: new Date().toISOString(),
  status: 'running',
  environment: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    vendure: require('@vendure/core/package.json').version,
    database: usePostgres
      ? 'PostgreSQL isolé, lancé pour cet essai et arrêté ensuite'
      : 'SQLite via sql.js, fichier temporaire propre à chaque exécution',
    payment: 'dummyPaymentHandler : aucun prestataire ni encaissement réel',
    server: 'bootstrap Vendure standard, écoute sur 127.0.0.1',
    data: 'Catalogue et comptes synthétiques exclusivement',
    stockGuardEnabled: guardStock,
  },
  cases: caseNames.map(name => ({ name, status: 'not_run' })),
  notTested: [
    ...(!usePostgres ? ['PostgreSQL et achats concurrents sur PostgreSQL'] : []),
    'Webhooks et encaissements d’un véritable prestataire de paiement',
    'Reprise de file de tâches et crash en cours de transaction',
    'Isolation entre deux installations et stockages distincts',
    'Extensions graphiques, responsive et Responsively App',
    'SEO, tests A/B, génération de médias et diffusion externe',
  ],
  evidence: {},
};

async function query(client, document, variables) {
  try {
    return await client.query(document, variables);
  } catch (error) {
    const errors = error.response?.errors;
    const safe = new Error(sanitize(errors?.map(e => e.message).join('; ') || error.message));
    safe.codes = errors?.map(e => e.extensions?.code).filter(Boolean) || [];
    throw safe;
  }
}

async function login(client, username, password) {
  try {
    const result = await client.asUserWithCredentials(username, password);
    assert.ok(result.id, 'Le compte de test doit être authentifié');
  } catch (error) {
    throw new Error(sanitize(error.response?.errors?.map(e => e.message).join('; ') || error.message));
  }
}

async function forbidden(action) {
  await assert.rejects(action, error =>
    error.codes?.includes('FORBIDDEN') || error.codes?.includes('UNAUTHORIZED'),
  );
}

async function check(name, action) {
  const item = report.cases.find(entry => entry.name === name);
  const start = performance.now();
  try {
    await action();
    item.status = 'passed';
    console.log(`✓ ${name}`);
  } catch (error) {
    item.status = 'failed';
    item.error = sanitize(error.message);
    throw error;
  } finally {
    item.durationMs = Math.round(performance.now() - start);
  }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

const productQuery = gql`
  query Product($id: ID!) {
    product(id: $id) {
      id name variants {
        id sku price currencyCode
        stockLevels { stockOnHand stockAllocated }
      }
    }
  }
`;
const orderQuery = gql`
  query Order($id: ID!) {
    order(id: $id) {
      id code state active totalWithTax currencyCode
      payments { id state amount refunds { id state total } }
    }
  }
`;
const addItem = gql`
  mutation AddItem($id: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $id, quantity: $quantity) {
      __typename
      ... on Order { id code totalWithTax }
      ... on InsufficientStockError { quantityAvailable }
      ... on ErrorResult { errorCode message }
    }
  }
`;
const pay = gql`
  mutation Pay($decline: Boolean!, $delayMs: Int = 0) {
    addPaymentToOrder(input: {
      method: "validation-payment",
      metadata: { shouldDecline: $decline, validationDelayMs: $delayMs }
    }) {
      __typename
      ... on Order { id code state totalWithTax currencyCode }
      ... on ErrorResult { errorCode message }
    }
  }
`;
const refund = gql`
  mutation Refund($paymentId: ID!, $amount: Money!) {
    refundOrder(input: { paymentId: $paymentId, amount: $amount, reason: "Validation locale" }) {
      __typename
      ... on Refund { id state total }
      ... on ErrorResult { errorCode message }
    }
  }
`;

async function main() {
  let app;
  let postgres;
  let postgresStarted = false;
  const subscriptions = [];
  try {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'commerce-core-validation-'));
    const port = await freePort();
    const adminPassword = newPassword();
    const cookieSecret = newPassword();
    let databaseOptions = {
      type: 'sqljs',
      database: undefined,
      location: path.join(dataDir, 'validation.sqlite'),
      autoSave: true,
      synchronize: true,
    };
    if (usePostgres) {
      const { default: EmbeddedPostgres } = await import('embedded-postgres');
      const pgPort = await freePort();
      const password = newPassword();
      postgres = new EmbeddedPostgres({
        databaseDir: path.join(dataDir, 'postgres'),
        user: 'validation',
        password,
        port: pgPort,
        persistent: true,
        authMethod: 'scram-sha-256',
        initdbFlags: ['--encoding=UTF8', '--locale=C'],
        postgresFlags: ['-h', '127.0.0.1', '-k', '/tmp'],
        onLog: () => {},
        onError: message => console.error(sanitize(String(message))),
      });
      await postgres.initialise();
      await postgres.start();
      postgresStarted = true;
      await postgres.createDatabase('commerce_validation');
      const databaseClient = postgres.getPgClient('commerce_validation', '127.0.0.1');
      await databaseClient.connect();
      const { rows } = await databaseClient.query('select version()');
      report.environment.postgresVersion = rows[0].version;
      await databaseClient.end();
      databaseOptions = {
        type: 'postgres',
        host: '127.0.0.1',
        port: pgPort,
        username: 'validation',
        password,
        database: 'commerce_validation',
        synchronize: true,
      };
    }
    function config() {
      return mergeConfig(testConfig, {
        apiOptions: { hostname: '127.0.0.1', port },
        authOptions: {
          superadminCredentials: { identifier: 'validation-admin', password: adminPassword },
          cookieOptions: { secret: cookieSecret },
          requireVerification: false,
        },
        dbConnectionOptions: databaseOptions,
        paymentOptions: {
          paymentMethodHandlers: [dummyPaymentHandler],
          paymentMethodEligibilityCheckers: guardStock ? [createStockEligibilityChecker()] : [],
        },
        plugins: [ProbePlugin],
      });
    }
    const cfg = config();
    const adminUrl = `http://127.0.0.1:${port}/${cfg.apiOptions.adminApiPath}`;
    const shopUrl = `http://127.0.0.1:${port}/${cfg.apiOptions.shopApiPath}`;
    const admin = new SimpleGraphQLClient(cfg, adminUrl);
    const newShop = () => new SimpleGraphQLClient(cfg, shopUrl);
    app = await bootstrap(cfg);
    assert.equal(app.getHttpServer().address().address, '127.0.0.1');
    const actualDatabase = app.get(TransactionalConnection).rawConnection;
    assert.equal(actualDatabase.options.type, usePostgres ? 'postgres' : 'sqljs');
    if (usePostgres) {
      const [actual] = await actualDatabase.query('select current_database() as name, version() as version');
      assert.equal(actual.name, 'commerce_validation');
      report.environment.vendureDatabaseVersion = actual.version;
    }
    await populateInitialData(app, {
      defaultLanguage: 'en',
      defaultZone: 'Europe',
      countries: [{ name: 'Belgium', code: 'BE', zone: 'Europe' }],
      taxRates: [{ name: 'Taxe fictive à zéro', percentage: 0 }],
      shippingMethods: [{ name: 'Livraison de test', price: 500 }],
      paymentMethods: [],
      collections: [],
    });
    await login(admin, 'validation-admin', adminPassword);
    const { activeChannel } = await query(admin, gql`query { activeChannel { id } }`);
    const channel = await query(admin, gql`
      mutation ConfigureChannel($id: ID!) {
        updateChannel(input: {
          id: $id, defaultCurrencyCode: EUR, availableCurrencyCodes: [EUR],
          pricesIncludeTax: true, trackInventory: true, outOfStockThreshold: 0
        }) {
          __typename
          ... on Channel { defaultCurrencyCode }
          ... on ErrorResult { message }
        }
      }`, { id: activeChannel.id });
    assert.equal(channel.updateChannel.__typename, 'Channel');
    await query(admin, gql`
      mutation Method($input: CreatePaymentMethodInput!) {
        createPaymentMethod(input: $input) { id }
      }
    `, { input: {
      code: 'validation-payment',
      enabled: true,
      handler: { code: 'dummy-payment-handler', arguments: [{ name: 'automaticSettle', value: 'true' }] },
      ...(guardStock ? { checker: { code: 'platform-stock-available', arguments: [] } } : {}),
      translations: [{ languageCode: 'en', name: 'Paiement fictif', description: 'Validation locale' }],
    } });

    const observed = { ordersPlaced: [], payments: [] };
    const bus = app.get(EventBus);
    subscriptions.push(bus.ofType(OrderPlacedEvent).subscribe(event => {
      observed.ordersPlaced.push({ code: event.order.code, state: event.toState });
    }));
    subscriptions.push(bus.ofType(PaymentStateTransitionEvent).subscribe(event => {
      observed.payments.push({ code: event.order.code, state: event.toState });
    }));

    await check(caseNames[0], () => forbidden(() => query(
      new SimpleGraphQLClient(cfg, adminUrl), gql`query { products { totalItems } }`,
    )));

    let productId, variantId;
    await check(caseNames[1], async () => {
      const { createProduct } = await query(admin, gql`
        mutation {
          createProduct(input: { enabled: true, translations: [{
            languageCode: en, name: "Gourde de validation", slug: "gourde-validation",
            description: "Produit synthétique sans vente réelle"
          }] }) { id }
        }`);
      productId = createProduct.id;
      const { createProductVariants } = await query(admin, gql`
        mutation Variant($id: ID!) {
          createProductVariants(input: [{
            productId: $id, sku: "VALIDATION-GOURDE", price: 2500,
            stockOnHand: 3, trackInventory: TRUE,
            useGlobalOutOfStockThreshold: false, outOfStockThreshold: 0,
            translations: [{ languageCode: en, name: "Gourde de validation" }]
          }]) { id price currencyCode }
        }`, { id: productId });
      variantId = createProductVariants[0].id;
      assert.equal(createProductVariants[0].price, 2500);
      assert.equal(createProductVariants[0].currencyCode, 'EUR');
      const stored = await query(admin, productQuery, { id: productId });
      assert.equal(stored.product.variants[0].stockLevels[0].stockOnHand, 3);
      const publicProduct = await query(newShop(), gql`
        query Product($id: ID!) { product(id: $id) { name variants { id priceWithTax currencyCode } } }
      `, { id: productId });
      assert.equal(publicProduct.product.name, 'Gourde de validation');
      assert.equal(publicProduct.product.variants[0].priceWithTax, 2500);
    });

    async function makeMember(code, permissions) {
      const password = newPassword();
      const email = `${code}@example.invalid`;
      const { createRole } = await query(admin, gql`
        mutation Role($input: CreateRoleInput!) { createRole(input: $input) { id } }
      `, { input: { code, description: 'Rôle de validation', permissions, channelIds: [activeChannel.id] } });
      await query(admin, gql`
        mutation Member($input: CreateAdministratorInput!) { createAdministrator(input: $input) { id } }
      `, { input: { firstName: 'Test', lastName: code, emailAddress: email, password, roleIds: [createRole.id] } });
      const client = new SimpleGraphQLClient(cfg, adminUrl);
      await login(client, email, password);
      return client;
    }

    let reader;
    await check(caseNames[2], async () => {
      reader = await makeMember('catalogue-reader', ['ReadCatalog']);
      const list = await query(reader, gql`query { products { totalItems } }`);
      assert.equal(list.products.totalItems, 1);
      await forbidden(() => query(reader, gql`
        mutation Edit($id: ID!) { updateProduct(input: { id: $id, enabled: false }) { id } }
      `, { id: productId }));
      await forbidden(() => query(reader, gql`query { orders { totalItems } }`));
      const actual = await query(admin, gql`query Product($id: ID!) { product(id: $id) { enabled } }`, { id: productId });
      assert.equal(actual.product.enabled, true);
    });

    await check(caseNames[3], async () => {
      await forbidden(() => query(reader, gql`query { platformProbe }`));
      const probeMember = await makeMember('probe-reader', [readProbe.Permission]);
      const result = await query(probeMember, gql`query { platformProbe }`);
      assert.equal(result.platformProbe, 'extension-authentifiee');
      await forbidden(() => query(probeMember, gql`query { products { totalItems } }`));
    });

    async function prepareOrder(client, quantity, label, itemVariantId = variantId) {
      const added = await query(client, addItem, { id: itemVariantId, quantity });
      assert.equal(added.addItemToOrder.__typename, 'Order');
      const customer = await query(client, gql`
        mutation Customer($email: String!) {
          setCustomerForOrder(input: { firstName: "Client", lastName: "Fictif", emailAddress: $email }) {
            __typename ... on ErrorResult { message }
          }
        }`, { email: `${label}@example.invalid` });
      assert.equal(customer.setCustomerForOrder.__typename, 'Order');
      const address = await query(client, gql`
        mutation {
          setOrderShippingAddress(input: {
            fullName: "Client Fictif", streetLine1: "1 rue de test",
            city: "Bruxelles", postalCode: "1000", countryCode: "BE"
          }) { __typename ... on ErrorResult { message } }
        }`);
      assert.equal(address.setOrderShippingAddress.__typename, 'Order');
      const shipping = await query(client, gql`query { eligibleShippingMethods { id priceWithTax } }`);
      assert.equal(shipping.eligibleShippingMethods.length, 1);
      assert.equal(shipping.eligibleShippingMethods[0].priceWithTax, 500);
      const method = await query(client, gql`
        mutation Shipping($id: ID!) {
          setOrderShippingMethod(shippingMethodId: [$id]) {
            __typename ... on Order { totalWithTax } ... on ErrorResult { message }
          }
        }`, { id: shipping.eligibleShippingMethods[0].id });
      assert.equal(method.setOrderShippingMethod.__typename, 'Order');
      const arranging = await query(client, gql`
        mutation { transitionOrderToState(state: "ArrangingPayment") {
          __typename ... on Order { id code state totalWithTax } ... on ErrorResult { message }
        } }`);
      assert.equal(arranging.transitionOrderToState.__typename, 'Order');
      return arranging.transitionOrderToState;
    }

    const buyer = newShop();
    let paidOrder, declinedOrder;
    await check(caseNames[4], async () => {
      const prepared = await prepareOrder(buyer, 2, 'acheteur-un');
      assert.equal(prepared.totalWithTax, 5500, '2 × 25 EUR + 5 EUR de livraison');
      const result = await query(buyer, pay, { decline: false });
      paidOrder = result.addPaymentToOrder;
      assert.equal(paidOrder.__typename, 'Order');
      assert.equal(paidOrder.state, 'PaymentSettled');
      assert.equal(paidOrder.totalWithTax, 5500);
      const actual = await query(admin, orderQuery, { id: paidOrder.id });
      assert.equal(actual.order.payments.length, 1);
      assert.equal(actual.order.payments[0].amount, 5500);
      assert.equal(actual.order.active, false);
      report.evidence.firstPurchase = { totalMinorUnits: 5500, currency: 'EUR', quantity: 2 };
    });

    const recoveringBuyer = newShop();
    await check(caseNames[5], async () => {
      declinedOrder = await prepareOrder(recoveringBuyer, 1, 'acheteur-deux');
      assert.equal(declinedOrder.totalWithTax, 3000);
      const result = await query(recoveringBuyer, pay, { decline: true });
      assert.equal(result.addPaymentToOrder.__typename, 'PaymentDeclinedError');
      const actual = await query(admin, orderQuery, { id: declinedOrder.id });
      assert.equal(actual.order.state, 'ArrangingPayment');
      assert.equal(actual.order.active, true);
      assert.equal(actual.order.payments.filter(payment => payment.state === 'Settled').length, 0);
    });

    await check(caseNames[6], async () => {
      const result = await query(recoveringBuyer, pay, { decline: false });
      assert.equal(result.addPaymentToOrder.id, declinedOrder.id);
      assert.equal(result.addPaymentToOrder.state, 'PaymentSettled');
      const actual = await query(admin, orderQuery, { id: declinedOrder.id });
      assert.equal(actual.order.payments.filter(payment => payment.state === 'Settled').length, 1);
    });

    await check(caseNames[7], async () => {
      const repeated = await query(buyer, pay, { decline: false });
      assert.equal(repeated.addPaymentToOrder.__typename, 'NoActiveOrderError');
      const actual = await query(admin, orderQuery, { id: paidOrder.id });
      assert.equal(actual.order.payments.length, 1);
      const list = await query(admin, gql`query { orders { totalItems } }`);
      assert.equal(list.orders.totalItems, 2);
    });

    await check(caseNames[8], async () => {
      const stock = await query(admin, productQuery, { id: productId });
      const levels = stock.product.variants[0].stockLevels;
      assert.equal(levels.reduce((n, level) => n + level.stockOnHand - level.stockAllocated, 0), 0);
      const attempt = await query(newShop(), addItem, { id: variantId, quantity: 1 });
      assert.equal(attempt.addItemToOrder.__typename, 'InsufficientStockError');
      assert.equal(attempt.addItemToOrder.quantityAvailable, 0);
      report.evidence.stockAfterPurchases = levels;
    });

    let paymentId;
    await check(caseNames[9], async () => {
      const actual = await query(admin, orderQuery, { id: paidOrder.id });
      paymentId = actual.order.payments[0].id;
      const result = await query(admin, refund, { paymentId, amount: 2500 });
      assert.equal(result.refundOrder.__typename, 'Refund');
      assert.equal(result.refundOrder.total, 2500);
      assert.equal(result.refundOrder.state, 'Pending');
      const settled = await query(admin, gql`
        mutation Settle($id: ID!) {
          settleRefund(input: { id: $id, transactionId: "LOCAL-REFUND-TEST" }) {
            __typename ... on Refund { state total } ... on ErrorResult { message }
          }
        }`, { id: result.refundOrder.id });
      assert.equal(settled.settleRefund.state, 'Settled');
      const reread = await query(admin, orderQuery, { id: paidOrder.id });
      assert.equal(reread.order.totalWithTax, 5500);
      assert.equal(reread.order.payments[0].refunds[0].total, 2500);
      report.evidence.refund = { capturedMinorUnits: 5500, refundedMinorUnits: 2500, remainingMinorUnits: 3000 };
    });

    await check(caseNames[10], async () => {
      const excessive = await query(admin, refund, { paymentId, amount: 4000 });
      assert.equal(excessive.refundOrder.__typename, 'RefundAmountError');
      const actual = await query(admin, orderQuery, { id: paidOrder.id });
      assert.equal(actual.order.payments[0].refunds.length, 1);
    });

    await check(caseNames[11], async () => {
      const deadline = Date.now() + 3000;
      while (observed.ordersPlaced.length < 2 && Date.now() < deadline) await delay(20);
      assert.equal(observed.ordersPlaced.length, 2);
      assert.deepEqual(observed.ordersPlaced.map(event => event.code).sort(), [paidOrder.code, declinedOrder.code].sort());
      assert.ok(observed.payments.some(event => event.state === 'Declined'));
      assert.equal(observed.payments.filter(event => event.state === 'Settled').length, 2);
      report.evidence.events = observed;
    });

    await check(caseNames[12], async () => {
      subscriptions.forEach(subscription => subscription.unsubscribe());
      await app.close();
      app = undefined;
      const restartConfig = config();
      restartConfig.dbConnectionOptions.synchronize = false;
      app = await bootstrap(restartConfig);
      const fresh = new SimpleGraphQLClient(restartConfig, adminUrl);
      await login(fresh, 'validation-admin', adminPassword);
      const restored = await query(fresh, orderQuery, { id: paidOrder.id });
      assert.equal(restored.order.code, paidOrder.code);
      assert.equal(restored.order.state, 'PaymentSettled');
      assert.equal(restored.order.payments[0].refunds[0].state, 'Settled');
      assert.equal(restored.order.payments[0].refunds[0].total, 2500);
      const stock = await query(fresh, productQuery, { id: productId });
      assert.equal(stock.product.variants[0].stockLevels[0].stockAllocated, 3);
      report.evidence.persistence = { ordersAndRefunds: true, stockAllocation: true };
    });

    if (usePostgres) {
      async function concurrentPurchases(initialStock, expectedPurchases, suffix) {
        const fresh = new SimpleGraphQLClient(cfg, adminUrl);
        await login(fresh, 'validation-admin', adminPassword);
        const { createProduct } = await query(fresh, gql`
          mutation Product($slug: String!) {
            createProduct(input: { enabled: true, translations: [{
              languageCode: en, name: "Stock concurrent", slug: $slug,
              description: "Produit synthétique de concurrence"
            }] }) { id }
          }`, { slug: `stock-concurrent-${suffix}` });
        const { createProductVariants } = await query(fresh, gql`
          mutation Variant($id: ID!, $stock: Int!, $sku: String!) {
            createProductVariants(input: [{
              productId: $id, sku: $sku, price: 2500,
              stockOnHand: $stock, trackInventory: TRUE,
              useGlobalOutOfStockThreshold: false, outOfStockThreshold: 0,
              translations: [{ languageCode: en, name: "Stock concurrent" }]
            }]) { id }
          }`, { id: createProduct.id, stock: initialStock, sku: `VALIDATION-CONCURRENT-${suffix}` });
        const lastVariantId = createProductVariants[0].id;
        const first = newShop();
        const second = newShop();
        const orderA = await prepareOrder(first, 1, `concurrent-${suffix}-a`, lastVariantId);
        const orderB = await prepareOrder(second, 1, `concurrent-${suffix}-b`, lastVariantId);
        const replies = await Promise.all([
          query(first, pay, { decline: false, delayMs: 150 }),
          query(second, pay, { decline: false, delayMs: 150 }),
        ]);
        const orders = await Promise.all([
          query(fresh, orderQuery, { id: orderA.id }),
          query(fresh, orderQuery, { id: orderB.id }),
        ]);
        const product = await query(fresh, productQuery, { id: createProduct.id });
        const levels = product.product.variants[0].stockLevels;
        const settledOrders = orders.filter(result => result.order.state === 'PaymentSettled');
        const settledPayments = orders.flatMap(result => result.order.payments)
          .filter(payment => payment.state === 'Settled');
        const scenario = {
          requests: 2,
          initialStock,
          simulatedGatewayDelayMs: 150,
          responses: replies.map(result => ({
            type: result.addPaymentToOrder.__typename,
            state: result.addPaymentToOrder.state,
            errorCode: result.addPaymentToOrder.errorCode,
          })),
          orders: orders.map(result => ({
            code: result.order.code, state: result.order.state,
            settledPayments: result.order.payments.filter(payment => payment.state === 'Settled').length,
          })),
          stockLevels: levels,
          gatewayCalls: gatewayCalls.filter(call => [orderA.code, orderB.code].includes(call.orderCode)).length,
        };
        (report.evidence.concurrentPurchases ??= []).push(scenario);
        assert.equal(settledOrders.length, expectedPurchases, 'Nombre de commandes payé autorisé par le stock initial');
        assert.equal(settledPayments.length, expectedPurchases, 'Nombre de paiements autorisé par le stock initial');
        assert.equal(scenario.gatewayCalls, expectedPurchases, 'Les refus de stock précèdent les appels au prestataire');
        assert.equal(levels.reduce((n, level) => n + level.stockAllocated, 0), expectedPurchases);
        assert.equal(levels.reduce((n, level) => n + level.stockOnHand - level.stockAllocated, 0), 0);
      }
      await check(caseNames[13], () => concurrentPurchases(1, 1, 'limite'));
      await check(caseNames[14], () => concurrentPurchases(2, 2, 'suffisant'));
    }

    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.error = sanitize(error.message);
    console.error(`ÉCHEC : ${report.error}`);
    process.exitCode = 1;
  } finally {
    subscriptions.forEach(subscription => subscription.unsubscribe());
    report.evidence.cleanup = {};
    try {
      if (app) await app.close();
      report.evidence.cleanup.httpServer = app ? 'stopped' : 'not_running';
    } catch (error) {
      report.status = 'failed';
      report.evidence.cleanup.httpServer = sanitize(error.message);
    }
    try {
      if (postgresStarted) await postgres.stop();
      report.evidence.cleanup.postgres = postgresStarted ? 'stopped' : 'not_started';
    } catch (error) {
      report.status = 'failed';
      report.evidence.cleanup.postgres = sanitize(error.message);
    }
    report.completedAt = new Date().toISOString();
    report.sourceHashes = {};
    for (const file of ['package.json', 'package-lock.json', 'test/core.test.cjs', 'test/probe-plugin.cjs', 'src/stock-eligibility.cjs']) {
      report.sourceHashes[file] = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
    }
    await mkdir(path.join(root, 'reports'), { recursive: true });
    const stamp = report.startedAt.replaceAll(/[:.]/g, '-');
    const target = path.join(root, 'reports', `run-${stamp}-${usePostgres ? 'postgres' : 'sqlite'}-${guardStock ? 'guarded' : 'baseline'}.json`);
    await writeFile(target, JSON.stringify(report, null, 2) + '\n');
    console.log(`Rapport : ${path.relative(root, target)}`);
  }
}

// embedded-postgres installs a beforeExit hook that exits with 0. Exit explicitly
// after awaited cleanup and report writing so a failed regression remains red.
main().then(
  () => process.exit(report.status === 'passed' ? 0 : 1),
  error => {
    console.error(sanitize(error.message));
    process.exit(1);
  },
);
