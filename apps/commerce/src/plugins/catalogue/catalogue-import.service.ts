import { Injectable } from '@nestjs/common';
import {
  ForbiddenError, ID, Permission, ProductService, ProductVariant,
  ProductVariantService, RequestContext, StockLocationService, TransactionalConnection, UserInputError,
} from '@vendure/core';
import { GlobalFlag } from '@vendure/common/lib/generated-types';
import { createHash } from 'node:crypto';
import { CatalogueImportReceipt } from './catalogue-import.entity';
import { ImportRow, parseCatalogueCsv } from './csv';

interface RowResult {
  line: number; key: string; name: string; sku: string; status: string; message: string;
  productId?: string; variantId?: string;
  price?: number; stock?: number;
}
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

@Injectable()
export class CatalogueImportService {
  constructor(
    private connection: TransactionalConnection,
    private products: ProductService,
    private variants: ProductVariantService,
    private stockLocations: StockLocationService,
  ) {}

  private authorize(ctx: RequestContext) {
    if (!ctx.userHasPermissions([Permission.SuperAdmin, Permission.CreateCatalog, Permission.CreateProduct])) {
      throw new ForbiddenError();
    }
  }

  async context(ctx: RequestContext) {
    this.authorize(ctx);
    const locations = await this.stockLocations.findAll(ctx, { take: 100 });
    return {
      channelId: ctx.channelId, channelCode: ctx.channel.code,
      currencyCode: ctx.channel.defaultCurrencyCode, languageCode: ctx.channel.defaultLanguageCode,
      pricesIncludeTax: ctx.channel.pricesIncludeTax,
      stockLocations: locations.items,
    };
  }

  private async inputs(ctx: RequestContext, csv: string, stockLocationId: ID) {
    this.authorize(ctx);
    if (!await this.stockLocations.findOne(ctx, stockLocationId)) {
      throw new UserInputError('Emplacement indisponible dans ce marché.');
    }
    let rows: ImportRow[];
    try { rows = parseCatalogueCsv(csv); }
    catch (error) { throw new UserInputError((error as Error).message); }
    const context = [String(ctx.channelId), ctx.channel.defaultLanguageCode, ctx.channel.defaultCurrencyCode, ctx.channel.pricesIncludeTax, String(stockLocationId)];
    return { rows, context, previewHash: digest(['catalogue-import-v1', context, csv]) };
  }

  private async inspect(ctx: RequestContext, row: ImportRow, fingerprint: string): Promise<RowResult> {
    const validInt = (value: number) => Number.isInteger(value) && value >= 0 && value <= 2147483647 ? value : undefined;
    const base = { line: row.line, key: row.key, name: row.name, sku: row.sku, price: validInt(row.price), stock: validInt(row.stock) };
    if (row.errors.length) return { ...base, status: 'invalid', message: row.errors.join(' ') };
    const receipt = await this.connection.getRepository(ctx, CatalogueImportReceipt).findOne({
      where: { channelId: String(ctx.channelId), rowKey: row.key },
    });
    if (receipt) {
      if (receipt.fingerprint !== fingerprint) return { ...base, status: 'conflict', message: 'Cette clé a déjà été utilisée avec un autre contenu ou emplacement.' };
      return { ...base, status: 'alreadyImported', message: 'Déjà importé. Aucune modification.', productId: receipt.productId, variantId: receipt.variantId };
    }
    const existing = await this.connection.getRepository(ctx, ProductVariant).createQueryBuilder('variant')
      .innerJoin('variant.channels', 'channel', 'channel.id = :channelId', { channelId: ctx.channelId })
      .where('variant.sku = :sku', { sku: row.sku }).andWhere('variant.deletedAt IS NULL').getOne();
    if (existing) return { ...base, status: 'conflict', message: 'Ce SKU existe dans ce marché. Modifier le produit depuis sa fiche.' };
    return { ...base, status: 'ready', message: 'Un produit et une variante seront créés.' };
  }

  async preview(ctx: RequestContext, csv: string, stockLocationId: ID) {
    const input = await this.inputs(ctx, csv, stockLocationId);
    const rows: RowResult[] = [];
    for (const row of input.rows) rows.push(await this.inspect(ctx, row, this.fingerprint(input.context, row)));
    return { previewHash: input.previewHash, rows };
  }

  private fingerprint(context: unknown[], row: ImportRow) {
    return digest(['catalogue-row-v1', context, row.key, row.name, row.sku, row.price, row.stock]);
  }

  async apply(ctx: RequestContext, csv: string, stockLocationId: ID, previewHash: string) {
    const input = await this.inputs(ctx, csv, stockLocationId);
    if (previewHash !== input.previewHash) throw new UserInputError('Le fichier ou le marché a changé. Refaire l’aperçu.');
    const rows: RowResult[] = [];
    for (const row of input.rows) {
      const fingerprint = this.fingerprint(input.context, row);
      try {
        // One transaction per row permits partial progress and safe resumption after a disconnected request.
        rows.push(await this.connection.withTransaction(ctx, async tx => {
          const repository = this.connection.getRepository(tx, CatalogueImportReceipt);
          // Serialize competing import requests for either the same key or SKU in this channel.
          for (const key of [`key:${row.key}`, `sku:${row.sku}`].sort()) {
            const lock = BigInt.asIntN(64, BigInt(`0x${digest([String(ctx.channelId), key]).slice(0, 16)}`));
            await repository.query('SELECT pg_advisory_xact_lock($1::bigint)', [lock.toString()]);
          }
          const result = await this.inspect(tx, row, fingerprint);
          if (result.status !== 'ready') return result;
          const languageCode = tx.channel.defaultLanguageCode;
          const product = await this.products.create(tx, {
            enabled: true,
            translations: [{ languageCode, name: row.name, slug: `import-${row.key.toLowerCase()}`, description: '' }],
          });
          const [variant] = await this.variants.create(tx, [{
            productId: product.id, sku: row.sku, enabled: true, price: row.price,
            translations: [{ languageCode, name: row.name }],
            stockLevels: [{ stockLocationId, stockOnHand: row.stock }], trackInventory: GlobalFlag.TRUE,
          }]);
          await repository.save(new CatalogueImportReceipt({
            channelId: String(tx.channelId), rowKey: row.key, fingerprint,
            productId: String(product.id), variantId: String(variant.id),
          }));
          return { ...result, status: 'imported', message: 'Produit et variante créés.', productId: String(product.id), variantId: String(variant.id) };
        }));
      } catch {
        rows.push({ line: row.line, key: row.key, name: row.name, sku: row.sku, status: 'failed',
          message: 'Import non confirmé. Refaire l’aperçu puis reprendre avec la même clé.' });
      }
    }
    return { previewHash: input.previewHash, rows };
  }
}
