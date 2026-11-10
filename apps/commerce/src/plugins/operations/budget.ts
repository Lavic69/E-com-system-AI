import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { BudgetReservation, Context, Money, Operation, refuse, validate } from './contracts';
import type { Intent, Receipt } from './types';

function period(now = new Date()) {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

export async function budgetStatus(
  manager: EntityManager,
  shopId: string,
  channelId: string,
  budgetId: string,
  lock = false,
) {
  const [budget] = await manager.query(
    `SELECT * FROM s12_budget WHERE id=$1 AND shop_id=$2 AND channel_id=$3${lock ? ' FOR UPDATE' : ''}`,
    [budgetId, shopId, channelId],
  );
  if (!budget) refuse('BUDGET_NOT_FOUND');
  const p = period();
  const [known] = await manager.query('SELECT known FROM s12_budget_period WHERE budget_id=$1 AND period_start=$2', [
    budgetId,
    p.start,
  ]);
  const [held] = await manager.query('SELECT COALESCE(sum(held),0) AS held FROM s12_reservation WHERE budget_id=$1', [
    budgetId,
  ]);
  return {
    ...budget,
    known: Number(known?.known ?? 0),
    held: Number(held.held),
    available: budget.ceiling - Number(known?.known ?? 0) - Number(held.held),
    period: p,
  };
}

export async function reserve(
  manager: EntityManager,
  context: Context,
  intent: Intent,
  operation: Operation,
): Promise<string | null> {
  if (!intent.connectionId) {
    if (intent.costCeiling.minor !== 0 || intent.budgetId) refuse('INVALID_LOCAL_COST');
    return null;
  }
  if (!intent.budgetId) refuse('BUDGET_REQUIRED');
  const budget = await budgetStatus(manager, context.scope.shopId, context.scope.channelId, intent.budgetId, true);
  if (budget.currency !== intent.costCeiling.currency || budget.blocked || budget.available < intent.costCeiling.minor)
    refuse('BUDGET_EXCEEDED');
  const [existing] = await manager.query('SELECT id FROM s12_reservation WHERE operation_id=$1', [
    operation.operationId,
  ]);
  if (existing) return existing.id;
  await manager.query(
    'INSERT INTO s12_budget_period(budget_id,period_start,period_end) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
    [budget.id, budget.period.start, budget.period.end],
  );
  const id = randomUUID();
  const reservation = validate<BudgetReservation>('BudgetReservation', {
    id,
    shopId: context.scope.shopId,
    budgetId: budget.id,
    operationId: operation.operationId,
    connectionId: intent.connectionId,
    periodStart: budget.period.start,
    periodEnd: budget.period.end,
    state: 'held',
    ceiling: intent.costCeiling,
    held: intent.costCeiling,
    knownCost: null,
    evidenceRefs: [],
  });
  await manager.query('INSERT INTO s12_reservation(id,operation_id,budget_id,document,held) VALUES($1,$2,$3,$4,$5)', [
    id,
    operation.operationId,
    budget.id,
    reservation,
    intent.costCeiling.minor,
  ]);
  return id;
}

export async function uncertainReservation(manager: EntityManager, id: string | null) {
  if (id)
    await manager.query(
      `UPDATE s12_reservation SET document=jsonb_set(document,'{state}','"uncertain"') WHERE id=$1 AND document->'knownCost'='null'::jsonb`,
      [id],
    );
}

export async function reconcileBudget(
  manager: EntityManager,
  operation: Operation,
  receipt: Receipt,
): Promise<boolean> {
  validate<Money>('Money', receipt.cost);
  if (!operation.budgetReservationId) {
    if (receipt.cost.minor !== 0) refuse('UNEXPECTED_COST');
    return false;
  }
  const [row] = await manager.query('SELECT * FROM s12_reservation WHERE id=$1', [operation.budgetReservationId]);
  const reservation: BudgetReservation = row.document;
  if (reservation.ceiling.currency !== receipt.cost.currency) refuse('RECEIPT_CURRENCY_MISMATCH');
  await manager.query('SELECT id FROM s12_budget WHERE id=$1 FOR UPDATE', [row.budget_id]);
  if (reservation.knownCost !== null) return reservation.knownCost.minor > reservation.ceiling.minor;
  reservation.state = 'reconciled';
  reservation.held = { ...receipt.cost, minor: 0 };
  reservation.knownCost = receipt.cost;
  reservation.evidenceRefs = [receipt.evidenceRef];
  validate('BudgetReservation', reservation);
  await manager.query('UPDATE s12_reservation SET held=0,document=$2 WHERE id=$1', [row.id, reservation]);
  await manager.query(
    `INSERT INTO s12_budget_period(budget_id,period_start,period_end,known) VALUES($1,$2,$3,$4)
    ON CONFLICT(budget_id,period_start) DO UPDATE SET known=s12_budget_period.known+EXCLUDED.known`,
    [row.budget_id, reservation.periodStart, reservation.periodEnd, receipt.cost.minor],
  );
  const exceeded = receipt.cost.minor > reservation.ceiling.minor;
  if (exceeded) await manager.query('UPDATE s12_budget SET blocked=true WHERE id=$1', [row.budget_id]);
  return exceeded;
}
