import { Administrator, Channel, Permission, RequestContext, User } from '@vendure/core';
import type { EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Context, refuse, validate } from './contracts';
import type { Intent, OperationsOptions } from './types';

export function marketFor(options: OperationsOptions, channel: Channel) {
  return options.marketForChannel ? options.marketForChannel(channel) : options.markets[String(channel.id)];
}

export async function identity(
  manager: EntityManager,
  options: OperationsOptions,
  userId: string,
  channelId: string,
  permission: string,
) {
  const user = await manager
    .getRepository(User)
    .findOne({ where: { id: userId }, relations: { roles: { channels: true } } });
  const admin = user && (await manager.getRepository(Administrator).findOne({ where: { user: { id: userId } } }));
  const channel = await manager.getRepository(Channel).findOne({ where: { id: channelId } });
  if (!user || user.deletedAt || !admin || admin.deletedAt || !channel || !marketFor(options, channel))
    refuse('FORBIDDEN');
  const superadmin = user.roles.some((role) => role.permissions.includes(Permission.SuperAdmin));
  const permissions = [
    ...new Set(
      user.roles
        .filter((role) => role.channels.some((c) => String(c.id) === channelId))
        .flatMap((role) => role.permissions),
    ),
  ];
  if (!superadmin && !permissions.includes(permission as Permission)) refuse('FORBIDDEN');
  return { user, channel, permissions: superadmin ? [Permission.SuperAdmin, permission] : permissions };
}

export async function resolveContext(
  manager: EntityManager,
  options: OperationsOptions,
  ctx: RequestContext,
  permission: string,
  delegationId?: string,
): Promise<Context> {
  if (ctx.apiType !== 'admin' || ctx.activeUserId == null) refuse('FORBIDDEN');
  const userId = String(ctx.activeUserId);
  const channelId = String(ctx.channelId);
  const { channel, permissions } = await identity(manager, options, userId, channelId, permission);
  const market = marketFor(options, channel)!;
  const languageCode = ctx.languageCode;
  const currencyCode = ctx.currencyCode;
  if (
    !market.languages.includes(languageCode) ||
    !channel.availableLanguageCodes.includes(languageCode) ||
    !market.currencies.includes(currencyCode as 'EUR' | 'USD') ||
    !channel.availableCurrencyCodes.includes(currencyCode)
  )
    refuse('CONTEXT_NOT_ALLOWED');
  let actor: Context['actor'] = { kind: 'member', id: userId, delegationId: null };
  const [principal] = await manager.query('SELECT agent_id FROM s12_agent WHERE user_id=$1', [userId]);
  if (principal) {
    if (['ApproveOperations', 'ManageOperations', 'ExecuteOperations'].includes(permission))
      refuse('AGENT_AUTHORITY_FORBIDDEN');
    if (permission === 'ProposeOperations' && !delegationId) refuse('AGENT_DELEGATION_REQUIRED');
    actor = { kind: 'agent', id: principal.agent_id, delegationId: null };
  }
  if (delegationId) {
    const [d] = await manager.query(
      'SELECT * FROM s12_delegation WHERE id=$1 AND shop_id=$2 AND channel_id=$3 AND user_id=$4',
      [delegationId, options.shopId, channelId, userId],
    );
    if (
      !principal ||
      !d ||
      principal.agent_id !== d.agent_id ||
      d.revoked ||
      new Date(d.expires_at) <= new Date() ||
      d.policy_version !== options.policyVersion
    )
      refuse('DELEGATION_REVOKED');
    actor = { kind: 'agent', id: d.agent_id, delegationId };
  }
  return validate<Context>('Context', {
    scope: { shopId: options.shopId, marketId: market.marketId, channelId, languageCode, currencyCode },
    actor,
    permissionCodes: permissions,
    policyVersion: options.policyVersion,
    resolvedAt: new Date().toISOString(),
    requestId: randomUUID(),
  });
}

export async function checkDelegation(
  manager: EntityManager,
  options: OperationsOptions,
  context: Context,
  intent: Intent,
) {
  if (context.actor.kind !== 'agent') {
    const [principal] = await manager.query('SELECT user_id FROM s12_agent WHERE user_id=$1', [context.actor.id]);
    if (principal) refuse('ACTOR_KIND_CHANGED');
    return context.actor.id;
  }
  const [d] = await manager.query(
    'SELECT * FROM s12_delegation WHERE id=$1 AND shop_id=$2 AND channel_id=$3 FOR SHARE',
    [context.actor.delegationId, options.shopId, context.scope.channelId],
  );
  if (
    !d ||
    d.revoked ||
    d.agent_id !== context.actor.id ||
    new Date(d.expires_at) <= new Date() ||
    d.policy_version !== options.policyVersion ||
    !d.capabilities.includes(intent.capability) ||
    intent.costCeiling.minor > d.ceiling ||
    intent.costCeiling.currency !== d.currency
  )
    refuse('DELEGATION_REVOKED');
  const { user } = await identity(manager, options, d.user_id, context.scope.channelId, 'ProposeOperations');
  assertAgentPermissions(user);
  return d.user_id as string;
}

// Dedicated agent accounts carry no native write permission. A member's ordinary
// commerce access cannot silently become an agent's delegated credential.
export function assertAgentPermissions(user: User) {
  const allowed = new Set(['Authenticated', 'ReadOperations', 'ProposeOperations', 'ApplyOperations']);
  if (user.roles.some((role) => role.permissions.some((permission) => !allowed.has(permission))))
    refuse('AGENT_PRIVILEGES_TOO_BROAD');
}
