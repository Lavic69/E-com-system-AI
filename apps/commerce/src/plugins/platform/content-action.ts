import { Injector, RequestContext, TransactionalConnection } from '@vendure/core';
import { EntityManager } from 'typeorm';
import { GraphQLError } from 'graphql';
import { ContentService } from '../content/content.service';
import { ContentPage } from '../content/content.entity';
import { Context, refuse } from '../operations/contracts';
import { Intent, TargetAdapter } from '../operations/types';

const contentErrors = new Set([
  'FORBIDDEN', 'CONTENT_NOT_FOUND', 'INVALID_CONTENT', 'CONTENT_REFERENCE_NOT_FOUND',
  'TARGET_VERSION_CHANGED', 'EDIT_LEASE_LOST', 'EDIT_RESERVED', 'PROTECTION_UNAVAILABLE',
]);

export class ContentActionAdapter implements TargetAdapter {
  readonly kind = 'content-page';
  readonly capability = 'content.save';
  readonly permission = 'EditContent';
  readonly mode = 'transactional' as const;
  private content!: ContentService;
  private connection!: TransactionalConnection;

  init(injector: Injector) {
    this.content = injector.get(ContentService);
    this.connection = injector.get(TransactionalConnection);
  }

  private input(intent: Intent) {
    const payload = intent.payload;
    const keys = ['headVersion', 'fencingToken', 'document', 'validate'];
    if (Object.keys(payload).length !== keys.length || keys.some(key => !Object.hasOwn(payload, key)) ||
      !/^[1-9][0-9]*$/.test(intent.target.version) || Number(intent.target.version) > 2147483647 ||
      !Number.isSafeInteger(payload.headVersion) || Number(payload.headVersion) < 1 ||
      !Number.isSafeInteger(payload.fencingToken) || Number(payload.fencingToken) < 1 ||
      typeof payload.validate !== 'boolean' || intent.connectionId !== null || intent.budgetId !== null ||
      intent.costCeiling.minor !== 0) refuse('INVALID_CONTENT_ACTION');
    return {
      pageId: intent.target.id, expectedRevision: Number(intent.target.version),
      fencingToken: Number(payload.fencingToken), document: payload.document, validate: payload.validate,
    };
  }

  private async domain<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); }
    catch (error) {
      if (error instanceof GraphQLError && contentErrors.has(String(error.extensions.code))) {
        refuse(String(error.extensions.code));
      }
      throw error;
    }
  }

  async prepare(manager: EntityManager, ctx: RequestContext, context: Context, intent: Intent) {
    if (!manager.queryRunner?.isTransactionActive || this.connection.getRepository(ctx, ContentPage).manager !== manager) {
      throw new Error('CONTENT_TRANSACTION_REQUIRED');
    }
    if (context.actor.kind !== 'member') refuse('CONTENT_AGENT_NOT_ENABLED');
    if (String(ctx.channelId) !== context.scope.channelId || intent.target.shopId !== context.scope.shopId) {
      refuse('CONTEXT_NOT_ALLOWED');
    }
    const input = this.input(intent);
    await this.domain(() => this.content.assertCanSave(ctx, input, context.scope.languageCode, Number(intent.payload.headVersion)));
  }

  async apply(manager: EntityManager, ctx: RequestContext, context: Context, intent: Intent) {
    await this.prepare(manager, ctx, context, intent);
    const page = await this.domain(() => this.content.save(ctx, this.input(intent)));
    return `content-version:${page.id}:${page.headVersion}`;
  }
}
