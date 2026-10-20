const {
  EntityHydrator,
  PaymentMethodEligibilityChecker,
  ProductVariantService,
  StockLevelService,
} = require('@vendure/core');

/**
 * Check and subsequent stock allocation run in the payment mutation's transaction.
 * This probe targets synchronous payment handlers; webhook flows need a separate
 * reservation/confirmation design before production.
 */
function createStockEligibilityChecker() {
  let hydrator;
  let variants;
  let stock;

  return new PaymentMethodEligibilityChecker({
    code: 'platform-stock-available',
    description: [{ languageCode: 'en', value: 'Stock must remain available before payment' }],
    args: {},
    init(injector) {
      hydrator = injector.get(EntityHydrator);
      variants = injector.get(ProductVariantService);
      stock = injector.get(StockLevelService);
    },
    async check(ctx, order) {
      await hydrator.hydrate(ctx, order, { relations: ['lines.productVariant'] });
      const requested = new Map();
      for (const line of order.lines) {
        const variant = line.productVariant;
        if (!variant) return false;
        const previous = requested.get(String(variant.id));
        requested.set(String(variant.id), {
          variant,
          quantity: (previous?.quantity || 0) + line.quantity,
        });
      }

      // Vendure orders these locks consistently, then reads bypass its request cache.
      await stock.lockStockLevelsForVariants(ctx, [...requested.values()].map(item => item.variant.id));
      for (const { variant, quantity } of requested.values()) {
        const available = await variants.getSaleableStockLevel(ctx, variant, { lockStockLevels: true });
        if (quantity > available) return false;
      }
      return true;
    },
  });
}

module.exports = { createStockEligibilityChecker };
