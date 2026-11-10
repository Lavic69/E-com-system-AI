import { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Logger, PluginCommonModule, ProcessContext, RequestContext, VendurePlugin } from '@vendure/core';
import type { EntityManager } from 'typeorm';
import { OperationsPlugin } from '../operations/operations.plugin';
import { OperationsService } from '../operations/operations.service';
import { eventDigest, receiveEvent } from '../operations/journal';
import type { Consumer } from '../operations/types';
import type { Event } from '../operations/contracts';

const states = new Set(['awaiting_approval', 'queued', 'running', 'succeeded', 'uncertain', 'awaiting_provider']);
const eventTypes = new Set(['proposed', 'approved', 'blocked', 'dispatched', 'succeeded', 'uncertain', 'reconciled'].map(type => `operations.${type}`));

export function actionConsumer(shopId: string): Consumer {
  const project = async (manager: EntityManager, event: Event, revision: number, state: string) => {
    await manager.query(`INSERT INTO platform_action_projection(action_id,shop_id,channel_id,revision,state,event_id)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(action_id) DO UPDATE SET revision=EXCLUDED.revision,
      state=EXCLUDED.state,event_id=EXCLUDED.event_id
      WHERE platform_action_projection.revision < EXCLUDED.revision`,
    [event.aggregate.id, shopId, event.scope.channelId, revision, state, event.eventId]);
  };
  return {
    id: 'platform-action-journal-v1',
    accepts: event => event.source.kind === 'server' && event.source.module === 'operations' &&
      event.source.accountId === null && event.aggregate.kind === 'action' && eventTypes.has(event.type),
    validatePayload: event => event.payloadVersion === 1 && Object.keys(event.payload).length === 2 &&
      event.payload.actionId === event.aggregate.id && typeof event.payload.state === 'string' && states.has(event.payload.state),
    async apply(manager, event) { await project(manager, event, event.sequence!, String(event.payload.state)); },
    async reconcile(manager, event) {
      const [row] = await manager.query('SELECT document FROM s12_action WHERE id=$1 AND shop_id=$2 AND channel_id=$3',
        [event.aggregate.id, shopId, event.scope.channelId]);
      if (!row) return null;
      await project(manager, event, row.document.revision, row.document.state);
      return row.document.revision;
    },
  };
}

// No public event receiver: provenance is checked against our own committed outbox.
export async function receiveLocalAction(operations: OperationsService, event: Event) {
  await operations.transaction(RequestContext.empty(), async manager => {
    const [source] = await manager.query('SELECT digest FROM s12_outbox WHERE id=$1', [event.eventId]);
    if (!source || source.digest !== eventDigest(event)) throw new Error('EVENT_PROVENANCE_REFUSED');
    const status = await receiveEvent(manager, operations.options.shopId, actionConsumer(operations.options.shopId), event);
    if (!['applied', 'duplicate', 'stale'].includes(status)) throw new Error('EVENT_DELIVERY_REFUSED');
  });
}

@VendurePlugin({
  imports: [PluginCommonModule, OperationsPlugin],
  compatibility: '3.8.0',
})
export class PlatformPlugin implements OnApplicationBootstrap, OnModuleDestroy {
  private stopped = false;
  private timer?: ReturnType<typeof setTimeout>;
  private active: Promise<void> = Promise.resolve();

  constructor(private processContext: ProcessContext, private operations: OperationsService) {}

  onApplicationBootstrap() {
    if (this.processContext.isWorker) this.schedule();
  }
  private schedule() {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.active = this.tick().catch(() => Logger.error('Traitement local interrompu ; reprise au prochain passage.', 'G1'))
        .finally(() => this.schedule());
    }, 1000);
  }
  async tick() {
    // G1 only registers transactional page actions. A crash leaves them queued.
    const rows = await this.operations.transaction(RequestContext.empty(), manager => manager.query(
      `SELECT id FROM s12_action WHERE shop_id=$1 AND document->>'state'='queued'
       ORDER BY created_at,id LIMIT 25`, [this.operations.options.shopId]));
    for (const row of rows) {
      if (this.stopped) return;
      try { await this.operations.execute(row.id); }
      catch { Logger.error('Action locale non appliquée ; transaction annulée.', 'G1'); }
    }
    for (let count = 0; count < 100 && !this.stopped; count++) {
      if (!await this.operations.deliverOne(event => receiveLocalAction(this.operations, event))) break;
    }
  }
  async onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.active;
  }
}
