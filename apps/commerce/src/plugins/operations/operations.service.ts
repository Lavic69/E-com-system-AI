import { ModuleRef } from '@nestjs/core';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Injector, RequestContext, RequestContextService, TransactionalConnection, User } from '@vendure/core';
import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import {
  Action,
  Authorization,
  Connection,
  Context,
  Event,
  Money,
  Operation,
  OperationError,
  fault,
  refuse,
  validate,
} from './contracts';
import { digest } from './canonical';
import { assertAgentPermissions, checkDelegation, identity, marketFor, resolveContext } from './authority';
import { budgetStatus, reconcileBudget, reserve, uncertainReservation } from './budget';
import { appendEvent, claimEvent } from './journal';
import { OPERATIONS_OPTIONS, type Intent, type OperationsOptions, type Receipt } from './types';

interface ActionRow {
  id: string;
  document: Action;
  intent: Intent;
  binding: Record<string, unknown>;
}
interface WorkRow {
  document: Operation;
  lease_token: string | null;
  lease_until: Date | null;
  dispatched_at: Date | null;
  receipt: Receipt | null;
}
interface Dispatch {
  action: Action;
  intent: Intent;
  operation: Operation;
  connection: Connection;
  token: string;
  reconcile: boolean;
}

@Injectable()
export class OperationsService implements OnModuleInit {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly contexts: RequestContextService,
    private readonly moduleRef: ModuleRef,
    @Inject(OPERATIONS_OPTIONS) readonly options: OperationsOptions,
  ) {}

  async onModuleInit() {
    const injector = new Injector(this.moduleRef);
    for (const adapter of this.options.adapters) await adapter.init?.(injector);
  }

  transaction<T>(ctx: RequestContext, work: (manager: EntityManager, ctx: RequestContext) => Promise<T>) {
    return this.connection.withTransaction(ctx, (inner) =>
      work(this.connection.getRepository(inner, User).manager, inner),
    );
  }

  private adapter(intent: Intent) {
    if (/product|variant|price|stock|order|payment|customer/i.test(intent.target.kind))
      refuse('COMMERCIAL_ADAPTER_NOT_VERIFIED');
    const adapter = this.options.adapters.find(
      (a) => a.kind === intent.target.kind && a.capability === intent.capability,
    );
    if (!adapter) refuse('TARGET_ADAPTER_UNAVAILABLE');
    if (adapter.mode === 'transactional' && (!adapter.apply || intent.connectionId)) refuse('INVALID_ADAPTER_MODE');
    if (adapter.mode === 'external' && !intent.connectionId) refuse('CONNECTION_REQUIRED');
    return adapter;
  }

  private async connectionFor(
    manager: EntityManager,
    context: Context,
    intent: Intent,
    consume = false,
  ): Promise<Connection | null> {
    if (!intent.connectionId) return null;
    const [row] = await manager.query(
      `SELECT document FROM s12_connection WHERE id=$1 AND shop_id=$2 AND channel_id=$3${consume ? ' FOR UPDATE' : ''}`,
      [intent.connectionId, context.scope.shopId, context.scope.channelId],
    );
    if (!row) refuse('CONNECTION_NOT_FOUND');
    const connection = validate<Connection>('Connection', row.document);
    const capability = connection.capabilities.find((c) => c.code === intent.capability);
    if (
      connection.state !== 'connected' ||
      connection.environment !== 'simulation' ||
      !capability ||
      !this.options.transports[connection.provider]
    )
      refuse('CONNECTION_UNAVAILABLE');
    if (
      connection.perOperationCeiling.currency !== intent.costCeiling.currency ||
      connection.perOperationCeiling.minor < intent.costCeiling.minor
    )
      refuse('COST_CEILING_EXCEEDED');
    if (consume) {
      if (
        connection.quota.status !== 'known' ||
        connection.quota.remaining === null ||
        connection.quota.remaining < 1 ||
        Date.now() - new Date(connection.quota.observedAt).getTime() > 300_000 ||
        (connection.quota.resetsAt && new Date(connection.quota.resetsAt).getTime() <= Date.now())
      )
        refuse('QUOTA_UNAVAILABLE');
      connection.quota.remaining--;
      await manager.query('UPDATE s12_connection SET document=$2 WHERE id=$1', [connection.id, connection]);
    }
    return connection;
  }

  private binding(context: Context, intent: Intent, connection: Connection | null) {
    return {
      canonicalization: 's12-c14n-v1',
      scope: context.scope,
      actor: context.actor,
      policyVersion: context.policyVersion,
      target: intent.target,
      proposal: { version: intent.proposalVersion, changeRef: intent.changeRef, payloadDigest: digest(intent.payload) },
      capability: intent.capability,
      effectKey: intent.effectKey,
      connection: connection
        ? {
            id: connection.id,
            provider: connection.provider,
            accountId: connection.accountId,
            environment: connection.environment,
            capability: connection.capabilities.find((c) => c.code === intent.capability)!,
          }
        : null,
      budgetId: intent.budgetId,
      costCeiling: intent.costCeiling,
    };
  }

  async propose(ctx: RequestContext, input: Intent, delegationId?: string) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) refuse('INVALID_PROPOSAL');
    digest(input);
    const keys = [
      'target',
      'proposalVersion',
      'changeRef',
      'capability',
      'effectKey',
      'payload',
      'connectionId',
      'budgetId',
      'costCeiling',
    ];
    if (!input || Object.keys(input).some((key) => !keys.includes(key)) || keys.some((key) => !(key in input)))
      refuse('INVALID_PROPOSAL');
    validate('VersionedReference', input.target);
    validate('Money', input.costCeiling);
    for (const key of ['proposalVersion', 'changeRef', 'capability', 'effectKey'] as const) {
      if (typeof input[key] !== 'string' || input[key].length < 1 || input[key].length > 160)
        refuse('INVALID_PROPOSAL');
    }
    if (!input.payload || Array.isArray(input.payload) || typeof input.payload !== 'object') refuse('INVALID_PROPOSAL');
    for (const id of [input.connectionId, input.budgetId])
      if (id !== null && (typeof id !== 'string' || !id.length || id.length > 160)) refuse('INVALID_PROPOSAL');
    const adapter = this.adapter(input);
    return this.transaction(ctx, async (manager, txCtx) => {
      const context = await resolveContext(manager, this.options, txCtx, 'ProposeOperations', delegationId);
      const actorUser = await checkDelegation(manager, this.options, context, input);
      await identity(manager, this.options, actorUser, context.scope.channelId, adapter.permission);
      if (input.target.shopId !== context.scope.shopId || input.costCeiling.currency !== context.scope.currencyCode)
        refuse('CONTEXT_NOT_ALLOWED');
      const connection = await this.connectionFor(manager, context, input);
      const binding = this.binding(context, input, connection);
      const hash = digest(binding);
      const effectKey = digest([context.scope.channelId, input.capability, input.effectKey]);
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [effectKey]);
      const [existing] = await manager.query(
        'SELECT a.* FROM s12_operation o JOIN s12_action a ON a.id=o.action_id WHERE o.shop_id=$1 AND o.effect_key=$2',
        [context.scope.shopId, effectKey],
      );
      if (existing) {
        if (existing.document.proposal.bindingDigest !== hash) refuse('EFFECT_KEY_CONFLICT');
        return existing.document as Action;
      }
      const id = randomUUID();
      const operation: Operation = {
        operationId: randomUUID(),
        idempotencyKey: randomUUID(),
        requestDigest: digest({ binding: hash, payload: input.payload }),
        capability: input.capability,
        connectionId: input.connectionId,
        budgetReservationId: null,
        state: 'prepared',
        attemptCount: 0,
        providerRequestId: null,
        evidenceRefs: [],
        error: null,
      };
      const action = validate<Action>('Action', {
        id,
        revision: 1,
        context,
        target: input.target,
        proposal: {
          version: input.proposalVersion,
          changeRef: input.changeRef,
          bindingDigest: hash,
          costCeiling: input.costCeiling,
        },
        authorization: null,
        state: 'awaiting_approval',
        operations: [operation],
        error: null,
      });
      await manager.query(
        'INSERT INTO s12_action(id,shop_id,channel_id,document,intent,binding) VALUES($1,$2,$3,$4,$5,$6)',
        [id, context.scope.shopId, context.scope.channelId, action, input, binding],
      );
      await manager.query(
        'INSERT INTO s12_operation(id,action_id,shop_id,effect_key,document) VALUES($1,$2,$3,$4,$5)',
        [operation.operationId, id, context.scope.shopId, effectKey, operation],
      );
      await this.event(manager, action, 'operations.proposed');
      return action;
    });
  }

  private async row(
    manager: EntityManager,
    id: string,
    channelId?: string,
    skipLocked = false,
  ): Promise<ActionRow | undefined> {
    const rows = await manager.query(
      `SELECT * FROM s12_action WHERE id=$1 AND shop_id=$2${channelId ? ' AND channel_id=$3' : ''} FOR UPDATE${skipLocked ? ' SKIP LOCKED' : ''}`,
      channelId ? [id, this.options.shopId, channelId] : [id, this.options.shopId],
    );
    return rows[0];
  }

  async approve(ctx: RequestContext, id: string, expectedDigest: string, expiresAt: string) {
    return this.transaction(ctx, async (manager, txCtx) => {
      const approver = await resolveContext(manager, this.options, txCtx, 'ApproveOperations');
      const row = await this.row(manager, id, approver.scope.channelId);
      if (!row) refuse('ACTION_NOT_FOUND');
      const action = row.document;
      if (action.state !== 'awaiting_approval') refuse('ACTION_NOT_APPROVABLE');
      const expiry = new Date(expiresAt).getTime();
      if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.now() + 86_400_000)
        refuse('INVALID_APPROVAL_EXPIRY');
      const current = this.binding(
        { ...action.context, policyVersion: this.options.policyVersion },
        row.intent,
        await this.connectionFor(manager, action.context, row.intent),
      );
      if (digest(current) !== expectedDigest || expectedDigest !== action.proposal.bindingDigest)
        refuse('APPROVAL_BINDING_CHANGED');
      const authorization = validate<Authorization>('Authorization', {
        kind: 'approval',
        referenceId: randomUUID(),
        actorId: approver.actor.id,
        bindingDigest: expectedDigest,
        policyVersion: this.options.policyVersion,
        issuedAt: new Date().toISOString(),
        expiresAt,
      });
      await manager.query('INSERT INTO s12_approval(id,action_id,document) VALUES($1,$2,$3)', [
        authorization.referenceId,
        id,
        authorization,
      ]);
      action.authorization = authorization;
      action.state = 'queued';
      action.error = null;
      action.revision++;
      await this.save(manager, action);
      await this.event(manager, action, 'operations.approved');
      return action;
    });
  }

  private async revalidate(manager: EntityManager, txCtx: RequestContext, row: ActionRow) {
    const action = row.document;
    const authorization = action.authorization;
    if (!authorization || new Date(authorization.expiresAt).getTime() <= Date.now()) refuse('APPROVAL_EXPIRED');
    if (authorization.policyVersion !== this.options.policyVersion) refuse('POLICY_CHANGED');
    const adapter = this.adapter(row.intent);
    const userId = await checkDelegation(manager, this.options, action.context, row.intent);
    const { user, channel } = await identity(
      manager,
      this.options,
      userId,
      action.context.scope.channelId,
      adapter.permission,
    );
    await identity(manager, this.options, userId, action.context.scope.channelId, 'ProposeOperations');
    await identity(manager, this.options, authorization.actorId, action.context.scope.channelId, 'ApproveOperations');
    const connection = await this.connectionFor(manager, action.context, row.intent);
    const binding = this.binding(
      { ...action.context, policyVersion: this.options.policyVersion },
      row.intent,
      connection,
    );
    if (
      digest(binding) !== authorization.bindingDigest ||
      digest(row.binding) !== authorization.bindingDigest ||
      digest({ binding: authorization.bindingDigest, payload: row.intent.payload }) !==
        action.operations[0].requestDigest
    )
      refuse('APPROVAL_BINDING_CHANGED');
    const ctx = await this.contexts.create({
      apiType: 'admin',
      user,
      channelOrToken: channel,
      languageCode: action.context.scope.languageCode as RequestContext['languageCode'],
      currencyCode: action.context.scope.currencyCode as RequestContext['currencyCode'],
    });
    // The adapter receives the transaction context, with a fresh identity for domain checks.
    const executionCtx = txCtx.copy();
    Object.assign(executionCtx, ctx);
    const market = marketFor(this.options, channel);
    if (!market) refuse('CONTEXT_NOT_ALLOWED');
    if (
      market.marketId !== action.context.scope.marketId ||
      !market.languages.includes(action.context.scope.languageCode) ||
      !market.currencies.includes(action.context.scope.currencyCode) ||
      !channel.availableLanguageCodes.includes(ctx.languageCode) ||
      !channel.availableCurrencyCodes.includes(ctx.currencyCode)
    )
      refuse('CONTEXT_NOT_ALLOWED');
    await adapter.prepare(manager, executionCtx, action.context, row.intent);
    return { adapter, executionCtx };
  }

  private async save(manager: EntityManager, action: Action) {
    validate('Action', action);
    await manager.query('UPDATE s12_action SET document=$2 WHERE id=$1', [action.id, action]);
    await manager.query('UPDATE s12_operation SET document=$2 WHERE id=$1', [
      action.operations[0].operationId,
      action.operations[0],
    ]);
  }

  private async event(manager: EntityManager, action: Action, type: string) {
    const now = new Date().toISOString();
    const event: Event = {
      eventId: randomUUID(),
      schemaVersion: 1,
      type,
      payloadVersion: 1,
      scope: action.context.scope,
      source: {
        kind: 'server',
        module: 'operations',
        accountId: null,
        sourceEventId: `${action.id}:${action.revision}`,
      },
      deduplicationKey: `${action.id}:${action.revision}`,
      occurredAt: now,
      receivedAt: now,
      recordedAt: now,
      aggregate: { shopId: action.context.scope.shopId, kind: 'action', id: action.id },
      sequence: action.revision,
      correlationId: action.context.requestId,
      causationId: null,
      payload: { actionId: action.id, state: action.state },
    };
    await appendEvent(manager, event);
  }

  // Called by a trusted worker. A caller-facing route must additionally check ExecuteOperations.
  async execute(id: string): Promise<Action | { state: 'busy' | 'not_found' }> {
    const dispatch = await this.transaction(
      RequestContext.empty(),
      async (manager, txCtx): Promise<Dispatch | Action | { state: 'busy' | 'not_found' }> => {
        const row = await this.row(manager, id, undefined, true);
        if (!row) return { state: 'not_found' };
        const action = row.document;
        const [work]: WorkRow[] = await manager.query('SELECT * FROM s12_operation WHERE action_id=$1', [id]);
        const operation = action.operations[0];
        if (
          operation.state === 'succeeded' ||
          !['queued', 'running', 'uncertain', 'awaiting_provider'].includes(action.state)
        )
          return action;
        if (work.lease_until && new Date(work.lease_until).getTime() > Date.now()) return { state: 'busy' };
        const reconcile = work.dispatched_at !== null;
        if (!reconcile) {
          // Savepoint preserves the refusal trace while rolling back an adapter's partial writes.
          await manager.query('SAVEPOINT s12_prepare');
          try {
            const { adapter, executionCtx } = await this.revalidate(manager, txCtx, row);
            operation.budgetReservationId = await reserve(manager, action.context, row.intent, operation);
            if (adapter.mode === 'transactional') {
              operation.state = 'running';
              operation.attemptCount++;
              await this.save(manager, action);
              const evidence = await adapter.apply!(manager, executionCtx, action.context, row.intent);
              operation.state = 'succeeded';
              operation.evidenceRefs = [evidence];
              operation.error = null;
              action.state = 'succeeded';
              action.error = null;
              action.revision++;
              await this.save(manager, action);
              await this.event(manager, action, 'operations.succeeded');
              await manager.query('RELEASE SAVEPOINT s12_prepare');
              return action;
            }
            await this.connectionFor(manager, action.context, row.intent, true);
            await manager.query('RELEASE SAVEPOINT s12_prepare');
          } catch (error) {
            await manager.query('ROLLBACK TO SAVEPOINT s12_prepare');
            if (!(error instanceof OperationError)) throw error;
            // Any reservation/write inside the savepoint was rolled back.
            operation.budgetReservationId = work.document.budgetReservationId;
            operation.state = 'prepared';
            operation.attemptCount = work.document.attemptCount;
            action.state = 'awaiting_approval';
            action.error = fault(error.code);
            action.revision++;
            await this.save(manager, action);
            await this.event(manager, action, 'operations.blocked');
            return action;
          }
        }
        // Reconciliation only reads the previous effect; revoked approval must not erase an existing cost.
        const [c] = await manager.query('SELECT document FROM s12_connection WHERE id=$1 AND shop_id=$2', [
          row.intent.connectionId,
          this.options.shopId,
        ]);
        if (!c || digest(this.binding(action.context, row.intent, c.document)) !== action.proposal.bindingDigest) {
          await this.markUncertain(manager, action, 'CONNECTION_CHANGED');
          return action;
        }
        const token = randomUUID();
        operation.state = 'running';
        operation.error = null;
        if (!reconcile) operation.attemptCount++;
        action.state = 'running';
        action.error = null;
        action.revision++;
        await manager.query(
          "UPDATE s12_operation SET lease_token=$2,lease_until=now()+($3 * interval '1 millisecond'),dispatched_at=COALESCE(dispatched_at,now()) WHERE id=$1",
          [operation.operationId, token, this.options.leaseMs ?? 30_000],
        );
        await this.save(manager, action);
        await this.event(manager, action, 'operations.dispatched');
        return { action, operation, intent: row.intent, connection: c.document, token, reconcile };
      },
    );
    if (!('operation' in dispatch)) return dispatch;
    const { action, operation, connection, intent, token, reconcile } = dispatch;
    let receipt: Receipt | null = null;
    let unknownCode = 'PROVIDER_RESULT_UNKNOWN';
    try {
      const transport = this.options.transports[connection.provider];
      const capability = connection.capabilities.find((c) => c.code === intent.capability);
      if (!transport || connection.state !== 'connected') unknownCode = 'CONNECTION_UNAVAILABLE';
      else if (reconcile) {
        if (capability?.lookup !== 'supported') unknownCode = 'MANUAL_RECONCILIATION_REQUIRED';
        else receipt = await transport.lookup(connection, operation.idempotencyKey);
      } else
        receipt = await transport.send(connection, operation.idempotencyKey, operation.requestDigest, intent.payload);
      if (receipt) {
        validate('Money', receipt.cost);
        if (
          receipt.requestDigest !== operation.requestDigest ||
          [receipt.evidenceRef, receipt.providerRequestId].some(
            (value) => typeof value !== 'string' || value.length < 1 || value.length > 160,
          )
        ) {
          receipt = null;
          unknownCode = 'RECEIPT_CONFLICT';
        }
      }
    } catch {
      receipt = null;
      unknownCode = 'PROVIDER_RESULT_UNKNOWN';
    }
    return this.transaction(RequestContext.empty(), async (manager) => {
      const row = await this.row(manager, action.id);
      if (!row) refuse('ACTION_NOT_FOUND');
      const [work]: WorkRow[] = await manager.query('SELECT * FROM s12_operation WHERE action_id=$1', [action.id]);
      if (work.lease_token !== token || row.document.operations[0].state === 'succeeded') return row.document;
      const current = row.document;
      const op = current.operations[0];
      if (receipt && receipt.cost.currency === current.proposal.costCeiling.currency) {
        const exceeded = await reconcileBudget(manager, op, receipt);
        op.state = 'succeeded';
        op.providerRequestId = receipt.providerRequestId;
        op.evidenceRefs = [receipt.evidenceRef];
        op.error = null;
        current.state = 'succeeded';
        current.error = exceeded ? fault('COST_CEILING_EXCEEDED', 'never') : null;
        current.revision++;
        await manager.query('UPDATE s12_operation SET receipt=$2,lease_token=null,lease_until=null WHERE id=$1', [
          op.operationId,
          receipt,
        ]);
        await this.save(manager, current);
        await this.event(manager, current, 'operations.reconciled');
      } else await this.markUncertain(manager, current, receipt ? 'RECEIPT_CURRENCY_MISMATCH' : unknownCode);
      return current;
    });
  }

  private async markUncertain(manager: EntityManager, action: Action, code: string) {
    const op = action.operations[0];
    op.state = 'uncertain';
    op.error = fault(code, 'reconcile_first');
    action.state = 'uncertain';
    action.error = op.error;
    action.revision++;
    await uncertainReservation(manager, op.budgetReservationId);
    await manager.query('UPDATE s12_operation SET lease_token=null,lease_until=null WHERE id=$1', [op.operationId]);
    await this.save(manager, action);
    await this.event(manager, action, 'operations.uncertain');
  }

  async executeFromApi(ctx: RequestContext, id: string) {
    await this.transaction(ctx, async (manager, inner) => {
      const context = await resolveContext(manager, this.options, inner, 'ExecuteOperations');
      if (!(await this.row(manager, id, context.scope.channelId))) refuse('ACTION_NOT_FOUND');
    });
    return this.execute(id);
  }

  async dossier(ctx: RequestContext, id?: string) {
    return this.transaction(ctx, async (manager, inner) => {
      const context = await resolveContext(manager, this.options, inner, 'ReadOperations');
      const rows = await manager.query(
        `SELECT document FROM s12_action WHERE shop_id=$1 AND channel_id=$2${id ? ' AND id=$3' : ''} ORDER BY created_at DESC LIMIT 100`,
        id ? [this.options.shopId, context.scope.channelId, id] : [this.options.shopId, context.scope.channelId],
      );
      const result = [];
      for (const row of rows) {
        const action: Action = row.document;
        const approvals = await manager.query(
          'SELECT document FROM s12_approval WHERE action_id=$1 ORDER BY created_at',
          [action.id],
        );
        const reservations = await manager.query('SELECT document FROM s12_reservation WHERE operation_id=$1', [
          action.operations[0].operationId,
        ]);
        result.push({
          action,
          approvals: approvals.map((r: { document: Authorization }) => r.document),
          reservations: reservations.map((r: { document: unknown }) => r.document),
        });
      }
      return result;
    });
  }

  async connections(ctx: RequestContext) {
    return this.transaction(ctx, async (manager, inner) => {
      const context = await resolveContext(manager, this.options, inner, 'ReadOperations');
      const rows = await manager.query('SELECT document FROM s12_connection WHERE shop_id=$1 AND channel_id=$2', [
        this.options.shopId,
        context.scope.channelId,
      ]);
      return rows.map((r: { document: Connection }) => {
        const { secretRef, ...safe } = r.document;
        return safe;
      });
    });
  }

  async configureConnection(ctx: RequestContext, document: Connection) {
    validate('Connection', document);
    return this.transaction(ctx, async (manager, inner) => {
      const context = await resolveContext(manager, this.options, inner, 'ManageOperations');
      if (document.shopId !== this.options.shopId || document.environment !== 'simulation') refuse('SIMULATION_ONLY');
      // Updating another channel's connection is forbidden, including with the same id.
      const rows = await manager.query(
        `INSERT INTO s12_connection(id,shop_id,channel_id,document) VALUES($1,$2,$3,$4)
        ON CONFLICT(id) DO UPDATE SET document=EXCLUDED.document
        WHERE s12_connection.shop_id=EXCLUDED.shop_id AND s12_connection.channel_id=EXCLUDED.channel_id RETURNING id`,
        [document.id, this.options.shopId, context.scope.channelId, document],
      );
      if (!rows.length) refuse('CONNECTION_NOT_FOUND');
      return true;
    });
  }

  async budget(ctx: RequestContext, id: string) {
    return this.transaction(ctx, async (manager, inner) => {
      const context = await resolveContext(manager, this.options, inner, 'ReadOperations');
      return budgetStatus(manager, this.options.shopId, context.scope.channelId, id);
    });
  }

  async configureBudget(ctx: RequestContext, id: string, ceiling: Money) {
    validate('Money', ceiling);
    if (!id || id.length > 160) refuse('INVALID_BUDGET_ID');
    return this.transaction(ctx, async (manager, inner) => {
      const context = await resolveContext(manager, this.options, inner, 'ManageOperations');
      if (ceiling.currency !== context.scope.currencyCode) refuse('CONTEXT_NOT_ALLOWED');
      const rows = await manager.query(
        `INSERT INTO s12_budget(id,shop_id,channel_id,currency,ceiling) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(id) DO UPDATE SET ceiling=EXCLUDED.ceiling
        WHERE s12_budget.shop_id=EXCLUDED.shop_id AND s12_budget.channel_id=EXCLUDED.channel_id
          AND s12_budget.currency=EXCLUDED.currency RETURNING id`,
        [id, this.options.shopId, context.scope.channelId, ceiling.currency, ceiling.minor],
      );
      if (!rows.length) refuse('BUDGET_NOT_FOUND');
      return budgetStatus(manager, this.options.shopId, context.scope.channelId, id);
    });
  }

  async grantDelegation(
    ctx: RequestContext,
    userId: string,
    agentId: string,
    capabilities: string[],
    ceiling: Money,
    expiresAt: string,
  ) {
    validate('Money', ceiling);
    if (
      !agentId ||
      agentId.length > 160 ||
      !capabilities.length ||
      capabilities.length > 32 ||
      new Set(capabilities).size !== capabilities.length
    )
      refuse('INVALID_DELEGATION');
    validate('Authorization', {
      kind: 'delegation',
      referenceId: 'validation',
      actorId: userId,
      bindingDigest: `sha256:${'0'.repeat(64)}`,
      policyVersion: this.options.policyVersion,
      issuedAt: new Date().toISOString(),
      expiresAt,
    });
    if (new Date(expiresAt).getTime() <= Date.now() || new Date(expiresAt).getTime() > Date.now() + 86_400_000)
      refuse('INVALID_DELEGATION_EXPIRY');
    return this.transaction(ctx, async (manager, inner) => {
      const context = await resolveContext(manager, this.options, inner, 'ManageOperations');
      if (ceiling.currency !== context.scope.currencyCode) refuse('CONTEXT_NOT_ALLOWED');
      const { user } = await identity(manager, this.options, userId, context.scope.channelId, 'ProposeOperations');
      assertAgentPermissions(user);
      for (const capability of capabilities) {
        const adapter = this.options.adapters.find((a) => a.capability === capability);
        if (!adapter) refuse('TARGET_ADAPTER_UNAVAILABLE');
        await identity(manager, this.options, userId, context.scope.channelId, adapter.permission);
      }
      const id = randomUUID();
      await manager.query(
        'INSERT INTO s12_agent(user_id,shop_id,agent_id) VALUES($1,$2,$3) ON CONFLICT(user_id) DO NOTHING',
        [userId, this.options.shopId, agentId],
      );
      const [principal] = await manager.query('SELECT * FROM s12_agent WHERE user_id=$1 FOR SHARE', [userId]);
      if (principal.shop_id !== this.options.shopId || principal.agent_id !== agentId)
        refuse('AGENT_IDENTITY_CONFLICT');
      await manager.query(
        `INSERT INTO s12_delegation(id,shop_id,channel_id,user_id,agent_id,capabilities,policy_version,ceiling,currency,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id,
          this.options.shopId,
          context.scope.channelId,
          userId,
          agentId,
          JSON.stringify(capabilities),
          this.options.policyVersion,
          ceiling.minor,
          ceiling.currency,
          expiresAt,
        ],
      );
      return id;
    });
  }

  async revokeDelegation(ctx: RequestContext, id: string) {
    return this.transaction(ctx, async (manager, inner) => {
      const context = await resolveContext(manager, this.options, inner, 'ManageOperations');
      const rows = await manager.query(
        `WITH changed AS (UPDATE s12_delegation SET revoked=true
        WHERE id=$1 AND shop_id=$2 AND channel_id=$3 RETURNING id) SELECT * FROM changed`,
        [id, this.options.shopId, context.scope.channelId],
      );
      if (!rows.length) refuse('DELEGATION_NOT_FOUND');
      return true;
    });
  }

  async deliverOne(deliver: (event: Event) => Promise<void>) {
    const item = await this.transaction(RequestContext.empty(), (manager) =>
      claimEvent(manager, this.options.leaseMs ?? 30_000),
    );
    if (!item) return false;
    await deliver(item.document);
    await this.transaction(RequestContext.empty(), async (manager) => {
      await manager.query(
        'UPDATE s12_outbox SET delivered_at=now(),lease_token=null,lease_until=null WHERE id=$1 AND lease_token=$2',
        [item.id, item.lease_token],
      );
    });
    return true;
  }
}
