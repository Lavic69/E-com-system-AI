import type { EntityManager } from 'typeorm';
import type { Channel, Injector, RequestContext } from '@vendure/core';
import type { Context, Money, VersionedReference, Connection, Event } from './contracts';

export interface Intent {
  target: VersionedReference;
  proposalVersion: string;
  changeRef: string;
  capability: string;
  effectKey: string;
  payload: Record<string, unknown>;
  connectionId: string | null;
  budgetId: string | null;
  costCeiling: Money;
}

export interface Receipt {
  providerRequestId: string;
  requestDigest: string;
  cost: Money;
  evidenceRef: string;
}
export interface TargetAdapter {
  init?(injector: Injector): void | Promise<void>;
  kind: string;
  capability: string;
  permission: string;
  mode: 'transactional' | 'external';
  // Must lock the real target and compare its revision, channel and edit lease.
  // Any local mutation uses this manager/ctx and returns before transaction commit.
  prepare(manager: EntityManager, ctx: RequestContext, context: Context, intent: Intent): Promise<void>;
  apply?(manager: EntityManager, ctx: RequestContext, context: Context, intent: Intent): Promise<string>;
}
export interface Transport {
  send(connection: Connection, key: string, requestDigest: string, payload: Record<string, unknown>): Promise<Receipt>;
  lookup(connection: Connection, key: string): Promise<Receipt | null>;
}
export interface OperationsOptions {
  shopId: string;
  policyVersion: string;
  markets: Record<string, { marketId: string; languages: string[]; currencies: ('EUR' | 'USD')[] }>;
  marketForChannel?: (channel: Channel) => { marketId: string; languages: string[]; currencies: ('EUR' | 'USD')[] } | undefined;
  adapters: TargetAdapter[];
  transports: Record<string, Transport>;
  leaseMs?: number;
}
export const OPERATIONS_OPTIONS = Symbol('OPERATIONS_OPTIONS');

export interface Consumer {
  id: string;
  // Server registration, never values accepted from a caller's event envelope.
  accepts(event: Event): boolean;
  validatePayload(event: Event): boolean;
  apply(manager: EntityManager, event: Event): Promise<void>;
  // Required for a sequence gap or a source without a reliable sequence.
  reconcile?(manager: EntityManager, event: Event): Promise<number | null>;
}
