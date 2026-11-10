import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { digest } from './canonical';
import { Event, validate } from './contracts';
import type { Consumer } from './types';

export function eventDigest(event: Event): string {
  const { receivedAt, recordedAt, eventId, ...content } = event;
  return digest(content);
}

export async function appendEvent(manager: EntityManager, event: Event) {
  if (!manager.queryRunner?.isTransactionActive) throw new Error('TRANSACTION_REQUIRED');
  validate('Event', event);
  if (event.aggregate.shopId !== event.scope.shopId) throw new Error('EVENT_SCOPE_MISMATCH');
  const hash = eventDigest(event);
  await manager.query('INSERT INTO s12_outbox(id, document, digest) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING', [
    event.eventId,
    event,
    hash,
  ]);
  const [existing] = await manager.query('SELECT digest FROM s12_outbox WHERE id=$1', [event.eventId]);
  if (existing.digest !== hash) throw new Error('EVENT_CONFLICT');
}

// Reception, projection and any resulting outbox writes share the caller's transaction.
export async function receiveEvent(manager: EntityManager, shopId: string, consumer: Consumer, input: unknown) {
  if (!manager.queryRunner?.isTransactionActive) throw new Error('TRANSACTION_REQUIRED');
  let event: Event;
  try {
    event = validate<Event>('Event', input);
  } catch {
    const hash = digest(input);
    const sourceKey = `invalid:${hash}`;
    await manager.query(
      "INSERT INTO s12_inbox(consumer_id,source_key,digest,status,document) VALUES($1,$2,$3,'quarantined',$4) ON CONFLICT DO NOTHING",
      [consumer.id, sourceKey, hash, { reason: 'INVALID_EVENT', digest: hash }],
    );
    await manager.query(
      "INSERT INTO s12_reception(consumer_id,source_key,digest,status) VALUES($1,$2,$3,'quarantined')",
      [consumer.id, sourceKey, hash],
    );
    return 'quarantined';
  }
  const sourceKey = digest([
    event.scope.shopId,
    event.source.kind,
    event.source.module,
    event.source.accountId,
    event.deduplicationKey,
  ]);
  const hash = eventDigest(event);
  await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`s12:${consumer.id}:${sourceKey}`]);
  const [existing] = await manager.query('SELECT * FROM s12_inbox WHERE consumer_id=$1 AND source_key=$2', [
    consumer.id,
    sourceKey,
  ]);
  let status: string;
  if (
    event.scope.shopId !== shopId ||
    event.aggregate.shopId !== shopId ||
    event.source.kind === 'browser' ||
    !consumer.accepts(event) ||
    !consumer.validatePayload(event)
  ) {
    status = 'quarantined';
  } else if (existing && existing.digest !== hash) {
    status = 'conflict';
    await manager.query("UPDATE s12_inbox SET status='conflict' WHERE consumer_id=$1 AND source_key=$2", [
      consumer.id,
      sourceKey,
    ]);
  } else if (existing && !['gap', 'needs_reconciliation'].includes(existing.status)) {
    status = existing.status === 'applied' || existing.status === 'stale' ? 'duplicate' : existing.status;
  } else {
    const aggregateKey = digest([
      event.scope.shopId,
      event.source.kind,
      event.source.module,
      event.source.accountId,
      event.aggregate,
    ]);
    await manager.query('INSERT INTO s12_cursor(consumer_id, aggregate_key) VALUES($1,$2) ON CONFLICT DO NOTHING', [
      consumer.id,
      aggregateKey,
    ]);
    const [cursor] = await manager.query(
      'SELECT sequence FROM s12_cursor WHERE consumer_id=$1 AND aggregate_key=$2 FOR UPDATE',
      [consumer.id, aggregateKey],
    );
    let sequence: number | null = event.sequence;
    if (sequence !== null && sequence <= cursor.sequence) status = 'stale';
    else if (sequence === null || sequence !== cursor.sequence + 1) {
      await manager.query('SAVEPOINT s12_reconcile');
      const reconciled = await consumer.reconcile?.(manager, event);
      if (reconciled == null || !Number.isSafeInteger(reconciled) || reconciled < (sequence ?? cursor.sequence)) {
        await manager.query('ROLLBACK TO SAVEPOINT s12_reconcile');
        status = sequence === null ? 'needs_reconciliation' : 'gap';
      } else {
        // reconcile applies the authoritative state itself; do not apply the stale envelope again.
        sequence = reconciled;
        status = 'applied';
      }
      await manager.query('RELEASE SAVEPOINT s12_reconcile');
    } else {
      await consumer.apply(manager, event);
      status = 'applied';
    }
    if (status === 'applied' && sequence !== null)
      await manager.query('UPDATE s12_cursor SET sequence=$3 WHERE consumer_id=$1 AND aggregate_key=$2', [
        consumer.id,
        aggregateKey,
        sequence,
      ]);
  }
  if (!existing)
    await manager.query('INSERT INTO s12_inbox(consumer_id,source_key,digest,status,document) VALUES($1,$2,$3,$4,$5)', [
      consumer.id,
      sourceKey,
      hash,
      status,
      event,
    ]);
  else if (['gap', 'needs_reconciliation'].includes(existing.status) && existing.digest === hash)
    await manager.query('UPDATE s12_inbox SET status=$3 WHERE consumer_id=$1 AND source_key=$2', [
      consumer.id,
      sourceKey,
      status,
    ]);
  await manager.query('INSERT INTO s12_reception(consumer_id,source_key,digest,status) VALUES($1,$2,$3,$4)', [
    consumer.id,
    sourceKey,
    hash,
    status,
  ]);
  return status;
}

export async function claimEvent(manager: EntityManager, leaseMs: number) {
  const token = randomUUID();
  const rows = await manager.query(
    `WITH claimed AS (UPDATE s12_outbox SET lease_token=$1,
    lease_until=now()+($2 * interval '1 millisecond'), attempts=attempts+1
    WHERE id=(SELECT id FROM s12_outbox WHERE delivered_at IS NULL AND (lease_until IS NULL OR lease_until < now())
      ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *) SELECT * FROM claimed`,
    [token, leaseMs],
  );
  return rows[0] as { id: string; document: Event; lease_token: string } | undefined;
}
