import { Inject, Injectable } from '@nestjs/common';
import { Asset, ID, Product, RequestContext, TransactionalConnection } from '@vendure/core';
import { IsNull } from 'typeorm';
import { ContentLeaseEvent, ContentPage, ContentRevision } from './content.entity';
import { contentDigest, fail, PageDocument, validateDocument } from './document';
import { editContent, readContent, selectContent } from './permissions';
import { CONTENT_PROTECTION, ContentProtection } from './protection';

export interface WriteTarget { pageId: ID; expectedRevision: number; fencingToken: number }
const leaseMilliseconds = 5 * 60 * 1000;

@Injectable()
export class ContentService {
  constructor(private connection: TransactionalConnection, @Inject(CONTENT_PROTECTION) private protection: ContentProtection) {}

  private authorize(ctx: RequestContext, permission: typeof readContent) {
    if (!ctx.activeUserId || !ctx.userHasPermissions([permission.Permission])) fail('FORBIDDEN', 'Accès au contenu refusé pour ce canal.');
  }

  async list(ctx: RequestContext, skip = 0, take = 50) {
    this.authorize(ctx, readContent);
    if (skip < 0 || take < 1 || take > 100) fail('INVALID_CONTENT', 'Pagination invalide.');
    const [items, totalItems] = await this.connection.getRepository(ctx, ContentPage).findAndCount({
      where: { channelId: ctx.channelId }, order: { updatedAt: 'DESC', id: 'DESC' }, skip, take,
    });
    return { items, totalItems };
  }

  private async page(ctx: RequestContext, id: ID, lock = false) {
    if (!/^[1-9][0-9]*$/.test(String(id)) || Number(id) > 2147483647) fail('CONTENT_NOT_FOUND', 'Page introuvable dans ce canal.');
    const query = this.connection.getRepository(ctx, ContentPage).createQueryBuilder('page')
      .where('page.id = :id AND page.channelId = :channelId', { id, channelId: ctx.channelId });
    if (lock) query.setLock('pessimistic_write');
    const page = await query.getOne();
    if (!page) fail('CONTENT_NOT_FOUND', 'Page introuvable dans ce canal.');
    return page;
  }

  async detail(ctx: RequestContext, id: ID) {
    this.authorize(ctx, readContent);
    const page = await this.page(ctx, id);
    const versions = await this.connection.getRepository(ctx, ContentRevision).find({
      where: { pageId: page.id }, order: { version: 'DESC' },
    });
    // Read only versions belonging to this snapshot when another editor saves concurrently.
    return { ...page, versions: versions.filter(version => version.version <= page.headVersion) };
  }

  private async references(ctx: RequestContext, document: PageDocument) {
    for (const block of document.blocks) {
      if (block.type === 'text') continue;
      const found = block.type === 'product'
        ? await this.connection.findOneInChannel(ctx, Product, block.productId, ctx.channelId, { where: { deletedAt: IsNull() } })
        : await this.connection.findOneInChannel(ctx, Asset, block.assetId, ctx.channelId);
      if (!found) fail('CONTENT_REFERENCE_NOT_FOUND', 'Produit ou média absent de ce canal.');
      if (block.type === 'media' && (!(found instanceof Asset) || !found.mimeType.startsWith('image/') || found.usage !== 'LIBRARY')) {
        fail('INVALID_CONTENT', 'Le média doit être une image de la bibliothèque.');
      }
    }
  }

  async preview(ctx: RequestContext, id: ID, version: number) {
    this.authorize(ctx, readContent);
    const page = await this.page(ctx, id);
    const record = await this.connection.getRepository(ctx, ContentRevision).findOne({ where: { pageId: page.id, version } });
    if (!record) fail('CONTENT_NOT_FOUND', 'Version introuvable.');
    const blocks = [];
    const assets: Asset[] = [];
    for (const block of record.document.blocks) {
      if (block.type === 'text') { blocks.push(block); continue; }
      const entity = block.type === 'product'
        ? await this.connection.findOneInChannel(ctx, Product, block.productId, ctx.channelId, { relations: ['translations'], where: { deletedAt: IsNull() } })
        : await this.connection.findOneInChannel(ctx, Asset, block.assetId, ctx.channelId);
      if (!entity || entity instanceof Asset && (entity.usage !== 'LIBRARY' || !entity.mimeType.startsWith('image/'))) {
        blocks.push({ ...block, missing: true }); continue;
      }
      if (block.type === 'product' && entity instanceof Product) {
        blocks.push({ ...block, name: entity.translations.find(item => item.languageCode === page.languageCode)?.name ?? 'Produit référencé' });
      } else if (entity instanceof Asset) {
        assets.push(entity);
        blocks.push(block);
      }
    }
    return { pageId: page.id, version, title: record.document.title, blocks, assets, localOnly: true };
  }

  private async now(ctx: RequestContext): Promise<Date> {
    const [row] = await this.connection.getRepository(ctx, ContentPage).query('SELECT clock_timestamp() AS now');
    return new Date(row.now);
  }

  private async insertVersion(ctx: RequestContext, page: ContentPage, document: PageDocument, validated: boolean, now: Date) {
    const digest = contentDigest(document);
    await this.connection.getRepository(ctx, ContentRevision).insert(new ContentRevision({
      pageId: page.id, version: page.headVersion, parentVersion: page.headVersion > 1 ? page.headVersion - 1 : null,
      state: validated ? 'validated' : 'draft', document, contentDigest: digest,
      themeVersion: 'local-preview-1', validatedAt: validated ? now : null,
      evidenceRefs: validated ? [`content-validation:${page.id}:${page.headVersion}`] : [], authorId: String(ctx.activeUserId),
    }));
  }

  async create(ctx: RequestContext, input: { slug: string; languageCode: string; document: unknown }) {
    this.authorize(ctx, editContent);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || input.slug.length > 160 ||
      !ctx.channel.availableLanguageCodes.some(code => code === input.languageCode)) fail('INVALID_CONTENT', 'Adresse ou langue de page invalide.');
    const document = validateDocument(input.document);
    try {
      return await this.connection.withTransaction(ctx, async tx => {
        await this.references(tx, document);
        const page = await this.connection.getRepository(tx, ContentPage).save(new ContentPage({
          channelId: tx.channelId, languageCode: input.languageCode, slug: input.slug, title: document.title,
          revision: 1, headVersion: 1, selectedVersion: null, fencingToken: 0,
        }));
        await this.protection.assertEditable(tx, page);
        await this.insertVersion(tx, page, document, false, await this.now(tx));
        return page;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') fail('CONTENT_SLUG_EXISTS', 'Cette adresse existe déjà dans cette langue.');
      throw error;
    }
  }

  private async locked<T>(ctx: RequestContext, id: ID, action: (tx: RequestContext, page: ContentPage) => Promise<T>) {
    return this.connection.withTransaction(ctx, async tx => {
      const page = await this.page(tx, id, true);
      await this.protection.assertEditable(tx, page);
      return action(tx, page);
    });
  }
  private checkRevision(page: ContentPage, revision: number) {
    if (page.revision !== revision) fail('TARGET_VERSION_CHANGED', 'La page a changé. Rechargez sa version avant de reprendre.');
  }
  private checkLease(ctx: RequestContext, page: ContentPage, token: number, now: Date) {
    if (!page.leaseHolder || page.leaseHolder !== String(ctx.activeUserId) || page.fencingToken !== token ||
      !page.expiresAt || page.expiresAt <= now) fail('EDIT_LEASE_LOST', 'Réservation expirée ou remplacée. Réservez à nouveau cette page.');
  }
  private async logLease(ctx: RequestContext, page: ContentPage, kind: string) {
    await this.connection.getRepository(ctx, ContentLeaseEvent).insert(new ContentLeaseEvent({
      pageId: page.id, kind, fencingToken: page.fencingToken, actorId: String(ctx.activeUserId),
    }));
  }

  async acquire(ctx: RequestContext, pageId: ID, expectedRevision: number) {
    this.authorize(ctx, editContent);
    return this.locked(ctx, pageId, async (tx, page) => {
      this.checkRevision(page, expectedRevision);
      const now = await this.now(tx);
      if (page.leaseHolder && page.expiresAt && page.expiresAt > now) fail('EDIT_RESERVED', 'Cette page est déjà réservée par un éditeur.');
      page.fencingToken++;
      page.leaseHolder = String(tx.activeUserId);
      page.acquiredAt = now;
      page.expiresAt = new Date(now.getTime() + leaseMilliseconds);
      await this.connection.getRepository(tx, ContentPage).save(page);
      await this.logLease(tx, page, 'acquired');
      return page;
    });
  }

  async renew(ctx: RequestContext, pageId: ID, fencingToken: number) {
    this.authorize(ctx, editContent);
    return this.locked(ctx, pageId, async (tx, page) => {
      const now = await this.now(tx);
      this.checkLease(tx, page, fencingToken, now);
      page.fencingToken++;
      page.expiresAt = new Date(now.getTime() + leaseMilliseconds);
      await this.connection.getRepository(tx, ContentPage).save(page);
      await this.logLease(tx, page, 'renewed');
      return page;
    });
  }

  async release(ctx: RequestContext, pageId: ID, fencingToken: number) {
    this.authorize(ctx, editContent);
    // Releasing an editing lease cannot release an experiment's durable protection.
    return this.connection.withTransaction(ctx, async tx => {
      const page = await this.page(tx, pageId, true);
      this.checkLease(tx, page, fencingToken, await this.now(tx));
      page.leaseHolder = null;
      page.expiresAt = null;
      await this.connection.getRepository(tx, ContentPage).save(page);
      await this.logLease(tx, page, 'released');
      return page;
    });
  }

  async assertCanSave(ctx: RequestContext, input: WriteTarget, languageCode: string, headVersion: number) {
    this.authorize(ctx, editContent);
    return this.locked(ctx, input.pageId, async (tx, page) => {
      this.checkRevision(page, input.expectedRevision);
      if (page.languageCode !== languageCode) fail('INVALID_CONTENT', 'La langue de la page diffère du contexte.');
      if (page.headVersion !== headVersion) fail('TARGET_VERSION_CHANGED', 'La version de contenu a changé.');
      this.checkLease(tx, page, input.fencingToken, await this.now(tx));
    });
  }

  async save(ctx: RequestContext, input: WriteTarget & { document: unknown; validate: boolean }) {
    this.authorize(ctx, editContent);
    const document = validateDocument(input.document);
    return this.locked(ctx, input.pageId, async (tx, page) => {
      this.checkRevision(page, input.expectedRevision);
      this.checkLease(tx, page, input.fencingToken, await this.now(tx));
      await this.references(tx, document);
      const now = await this.now(tx);
      this.checkLease(tx, page, input.fencingToken, now);
      page.headVersion++;
      page.revision++;
      page.title = document.title;
      await this.insertVersion(tx, page, document, input.validate, now);
      await this.connection.getRepository(tx, ContentPage).save(page);
      return page;
    });
  }

  async select(ctx: RequestContext, input: WriteTarget & { version: number }) {
    this.authorize(ctx, selectContent);
    return this.locked(ctx, input.pageId, async (tx, page) => {
      this.checkRevision(page, input.expectedRevision);
      this.checkLease(tx, page, input.fencingToken, await this.now(tx));
      const version = await this.connection.getRepository(tx, ContentRevision).findOne({ where: { pageId: page.id, version: input.version } });
      if (!version || version.state !== 'validated') fail('CONTENT_NOT_VALIDATED', 'Sélectionnez une version validée.');
      await this.references(tx, version.document);
      this.checkLease(tx, page, input.fencingToken, await this.now(tx));
      page.selectedVersion = version.version;
      page.revision++;
      await this.connection.getRepository(tx, ContentPage).save(page);
      return page;
    });
  }
}
